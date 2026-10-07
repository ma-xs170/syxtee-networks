import { Container } from "../ui";

// Trois phrases, pour comprendre le service sans rien connaître : filmer, réunir les connexions, diffuser.
const STEPS = [
  { n: "1", title: "Tu filmes", text: "Avec ton téléphone ou une caméra, où que tu sois : dans la rue, en voyage, en événement." },
  { n: "2", title: "SYXTEE réunit tes connexions", text: "4G, 5G, Wi-Fi, Starlink : la vidéo part par toutes en même temps. Si l'une faiblit, les autres prennent le relais." },
  { n: "3", title: "Tu diffuses", text: "Le direct arrive stable sur Twitch, YouTube ou Kick, et tu pilotes OBS depuis ton téléphone." },
];

export default function HowItWorks3() {
  return (
    <section aria-labelledby="how-title" className="border-b border-line py-20 sm:py-24">
      <Container>
        <h2 id="how-title" className="h-section max-w-2xl">Comment ça marche.</h2>
        <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t border-line-strong pt-6">
              <span className="font-mono text-sm text-muted">0{s.n}</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
