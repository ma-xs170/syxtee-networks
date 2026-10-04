import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  Client,
  type EmbedBuilder,
  GatewayIntentBits,
  type Interaction,
  MessageFlags,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  type TextBasedChannel,
} from "discord.js";
import { loadConfig } from "./config.ts";
import { announceEmbed, helpEmbed, linksEmbed, liveEmbed, serverEmbed, servicesEmbed } from "./embeds.ts";
import { startMonitor } from "./monitor.ts";
import { baseEmbed, files } from "./theme.ts";
import { startWeb } from "./web.ts";

const cfg = loadConfig();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder().setName("services").setDescription("État des services SYXTEE, actualisé en direct"),
  new SlashCommandBuilder().setName("live").setDescription("Les directs en cours"),
  new SlashCommandBuilder().setName("serveur").setDescription("CPU, mémoire et réseau du VPS"),
  new SlashCommandBuilder().setName("ping").setDescription("Latence du bot"),
  new SlashCommandBuilder().setName("liens").setDescription("Liens utiles SYXTEE"),
  new SlashCommandBuilder().setName("aide").setDescription("Liste des commandes"),
  new SlashCommandBuilder()
    .setName("annonce")
    .setDescription("Publier une nouveauté dans le salon dédié")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName("titre").setDescription("Titre").setRequired(true).setMaxLength(200))
    .addStringOption((o) => o.setName("message").setDescription("Texte (\\n pour un retour à la ligne)").setRequired(true).setMaxLength(3500))
    .addStringOption((o) => o.setName("lien").setDescription("Lien du titre (optionnel)")),
].map((c) => c.toJSON());

async function registerCommands() {
  const rest = new REST().setToken(cfg.DISCORD_TOKEN);
  const route = cfg.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(cfg.DISCORD_CLIENT_ID, cfg.DISCORD_GUILD_ID)
    : Routes.applicationCommands(cfg.DISCORD_CLIENT_ID);
  await rest.put(route, { body: commands });
  console.log(`${commands.length} commandes enregistrées (${cfg.DISCORD_GUILD_ID ? "serveur" : "globales"}).`);
}

async function newsChannel(): Promise<TextBasedChannel | null> {
  const ch = await client.channels.fetch(cfg.DISCORD_CHANNEL_ID).catch(() => null);
  return ch && ch.isTextBased() ? ch : null;
}

async function publish(embed: EmbedBuilder) {
  const ch = await newsChannel();
  if (!ch || !("send" in ch)) throw new Error("salon introuvable ou sans droit d'écriture");
  await ch.send({ embeds: [embed], files: files(true) });
}

// ───── /services : message qui se réactualise (édition toutes les 20 s, ~14 min : limite du jeton d'interaction) ─────

const REFRESH_MS = 20_000;
const LIFETIME_MS = 14 * 60_000;
const refreshRow = () =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("services:refresh").setLabel("Actualiser").setStyle(ButtonStyle.Danger));

async function liveServices(i: ChatInputCommandInteraction) {
  await i.deferReply();
  const draw = async () => {
    const { embed } = await servicesEmbed(cfg);
    await i.editReply({ embeds: [embed], files: files(true), components: [refreshRow()] });
  };
  await draw();
  const stop = Date.now() + LIFETIME_MS;
  const timer = setInterval(async () => {
    if (Date.now() >= stop) return clearInterval(timer);
    try {
      await draw();
    } catch {
      clearInterval(timer); // message supprimé ou jeton expiré
    }
  }, REFRESH_MS);
}

async function reply(i: ChatInputCommandInteraction, build: () => Promise<EmbedBuilder> | EmbedBuilder) {
  await i.deferReply();
  await i.editReply({ embeds: [await build()], files: files(true) });
}

async function onCommand(i: ChatInputCommandInteraction) {
  switch (i.commandName) {
    case "services":
      return liveServices(i);
    case "live":
      return reply(i, () => liveEmbed(cfg));
    case "serveur":
      return reply(i, () => serverEmbed(cfg));
    case "liens":
      return reply(i, () => linksEmbed(cfg));
    case "aide":
      return reply(i, () => helpEmbed());
    case "ping": {
      const sent = await i.reply({ embeds: [baseEmbed({ title: "Ping…" })], files: files(), withResponse: true });
      const ms = sent.resource?.message ? sent.resource.message.createdTimestamp - i.createdTimestamp : 0;
      return i.editReply({ embeds: [baseEmbed({ title: "Pong", description: `Aller-retour **${ms} ms** · passerelle **${Math.round(client.ws.ping)} ms**` })] });
    }
    case "annonce": {
      if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return i.reply({ content: "Réservé aux gérants du serveur.", flags: MessageFlags.Ephemeral });
      const body = i.options.getString("message", true).replaceAll("\\n", "\n");
      await publish(announceEmbed({ title: i.options.getString("titre", true), body, url: i.options.getString("lien") ?? undefined, tag: "Annonce" }));
      return i.reply({ content: "Annonce publiée.", flags: MessageFlags.Ephemeral });
    }
  }
}

client.on("interactionCreate", async (i: Interaction) => {
  try {
    if (i.isChatInputCommand()) await onCommand(i);
    else if (i.isButton() && i.customId === "services:refresh") {
      const { embed } = await servicesEmbed(cfg);
      await i.update({ embeds: [embed], components: [refreshRow()] });
    }
  } catch (err) {
    console.error("interaction:", err);
    if (i.isRepliable() && !i.replied && !i.deferred) await i.reply({ content: "Erreur, réessaie.", flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

client.once("clientReady", async () => {
  console.log(`Connecté : ${client.user?.tag}`);
  client.user?.setPresence({ activities: [{ name: "syxtee-networks · /services", type: ActivityType.Watching }], status: "online" });
  startMonitor(client, cfg, newsChannel);
});

startWeb(cfg, publish);
await registerCommands();
await client.login(cfg.DISCORD_TOKEN);

for (const sig of ["SIGTERM", "SIGINT"] as const) process.on(sig, () => void client.destroy().then(() => process.exit(0)));
