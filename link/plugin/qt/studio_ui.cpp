#include "studio_ui.h"

#include <QAbstractButton>
#include <QComboBox>
#include <QDateTime>
#include <QDesktopServices>
#include <QDialog>
#include <QFrame>
#include <QHBoxLayout>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QLabel>
#include <QLayoutItem>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QPainter>
#include <QProgressBar>
#include <QPushButton>
#include <QScrollArea>
#include <QStyle>
#include <QStackedWidget>
#include <QTimer>
#include <QVBoxLayout>
#include <functional>

namespace {

// Couleurs du site (globals.css) : gris foncé doux, un seul accent rouge.
const char *kStyle = R"(
QDialog { background: #15171c; }
QLabel { color: #f2f3f5; font-size: 13px; }
QLabel#muted { color: #9aa0ab; font-size: 12px; }
QLabel#section { color: #9aa0ab; font-family: Menlo, monospace; font-size: 11px; letter-spacing: 2px; }
QLabel#title { font-size: 17px; font-weight: 600; }
QLabel#h1 { font-size: 20px; font-weight: 600; }
QLabel#badge { background: rgba(255,255,255,0.08); color: #f2f3f5; border-radius: 10px; padding: 3px 10px; font-size: 11px; }
QLabel#badge[ok="false"] { color: #9aa0ab; }
QLabel#version { color: #9aa0ab; font-family: Menlo, monospace; font-size: 11px; }
QLabel#code { font-family: Menlo, monospace; font-size: 26px; letter-spacing: 6px; color: #f2f3f5; }
QLabel#alert { background: rgba(217,45,45,0.14); color: #ff8a80; border: 1px solid rgba(217,45,45,0.45); border-radius: 10px; padding: 10px 12px; font-size: 12px; }
QFrame#card { background: #1b1e24; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
QFrame#sep { background: rgba(255,255,255,0.08); max-height: 1px; min-height: 1px; border: none; }
QPushButton { background: transparent; color: #f2f3f5; border: 1px solid rgba(255,255,255,0.16); border-radius: 15px; padding: 6px 16px; font-size: 12px; }
QPushButton:hover { background: rgba(255,255,255,0.08); }
QPushButton:disabled { color: #596070; border-color: rgba(255,255,255,0.08); }
QPushButton#primary { background: #d92d2d; color: #ffffff; border: 1px solid #d92d2d; padding: 9px 22px; font-size: 13px; font-weight: 600; border-radius: 18px; }
QPushButton#primary:hover { background: #c42525; }
QPushButton#tab { border: none; border-bottom: 2px solid transparent; border-radius: 0; padding: 9px 4px; margin-right: 18px; color: #9aa0ab; font-family: Menlo, monospace; font-size: 11px; letter-spacing: 2px; }
QPushButton#tab:hover { background: transparent; color: #f2f3f5; }
QPushButton#tab:checked { color: #f2f3f5; border-bottom: 2px solid #d92d2d; }
QComboBox { background: #15171c; color: #f2f3f5; border: 1px solid rgba(255,255,255,0.16); border-radius: 8px; padding: 5px 10px; min-width: 150px; font-size: 12px; }
QComboBox:disabled { color: #596070; border-color: rgba(255,255,255,0.08); }
QComboBox QAbstractItemView { background: #1b1e24; color: #f2f3f5; selection-background-color: #23262d; border: 1px solid rgba(255,255,255,0.16); }
QProgressBar { background: #23262d; border: none; border-radius: 3px; max-height: 6px; min-height: 6px; }
QProgressBar::chunk { background: #f2f3f5; border-radius: 3px; }
QScrollArea { background: transparent; border: none; }
QScrollArea > QWidget > QWidget { background: transparent; }
QScrollBar:vertical { background: transparent; width: 8px; }
QScrollBar::handle:vertical { background: rgba(255,255,255,0.16); border-radius: 4px; min-height: 24px; }
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
)";

QString fmtSize(double n)
{
	if (n >= 1e9) return QString::number(n / 1e9, 'f', 1) + " Go";
	if (n >= 1e6) return QString::number(n / 1e6, 'f', 0) + " Mo";
	return QString::number(qMax(1.0, n / 1e3), 'f', 0) + " Ko";
}

QLabel *label(const QString &text, const char *name = nullptr)
{
	auto *l = new QLabel(text);
	if (name) l->setObjectName(name);
	l->setWordWrap(true);
	return l;
}

void clear(QLayout *l)
{
	while (QLayoutItem *it = l->takeAt(0)) {
		if (QWidget *w = it->widget()) w->deleteLater();
		if (QLayout *c = it->layout()) { clear(c); delete c; }
		delete it;
	}
}

// Interrupteur rond (peint à la main).
class Switch : public QAbstractButton {
public:
	explicit Switch(QWidget *parent = nullptr) : QAbstractButton(parent)
	{
		setCheckable(true);
		setCursor(Qt::PointingHandCursor);
		setFixedSize(38, 22);
	}
protected:
	void paintEvent(QPaintEvent *) override
	{
		QPainter p(this);
		p.setRenderHint(QPainter::Antialiasing);
		const bool on = isChecked();
		p.setPen(Qt::NoPen);
		QColor track = on ? QColor("#d92d2d") : QColor(255, 255, 255, 40);
		if (!isEnabled()) track.setAlpha(60);
		p.setBrush(track);
		p.drawRoundedRect(rect(), 11, 11);
		p.setBrush(isEnabled() ? QColor("#ffffff") : QColor("#9aa0ab"));
		p.drawEllipse(QRect(on ? width() - 20 : 2, 2, 18, 18));
	}
};

QFrame *card()
{
	auto *f = new QFrame;
	f->setObjectName("card");
	auto *v = new QVBoxLayout(f);
	v->setContentsMargins(16, 6, 16, 6);
	v->setSpacing(0);
	return f;
}

QFrame *sep()
{
	auto *f = new QFrame;
	f->setObjectName("sep");
	return f;
}

// Ligne de carte : libellé (et sous-libellé) à gauche, contrôle ou valeur à droite.
QWidget *row(const QString &title, const QString &sub, QWidget *right)
{
	auto *w = new QWidget;
	auto *h = new QHBoxLayout(w);
	h->setContentsMargins(0, 10, 0, 10);
	h->setSpacing(12);
	auto *left = new QVBoxLayout;
	left->setSpacing(2);
	left->addWidget(label(title));
	if (!sub.isEmpty()) left->addWidget(label(sub, "muted"));
	h->addLayout(left, 1);
	if (auto *combo = qobject_cast<QComboBox *>(right)) combo->setFixedWidth(200);
	if (right) h->addWidget(right, 0, Qt::AlignVCenter | Qt::AlignRight);
	return w;
}

void addRow(QFrame *c, QWidget *r, bool first = false)
{
	auto *v = static_cast<QVBoxLayout *>(c->layout());
	if (!first) v->addWidget(sep());
	v->addWidget(r);
}

class Studio : public QDialog {
public:
	Studio(QWidget *parent, int port, const QByteArray &token) : QDialog(parent), port_(port), token_(token)
	{
		setWindowTitle("SYXTEE Studio");
		setStyleSheet(kStyle);
		setMinimumSize(560, 640);
		resize(580, 700);
		build();
		timer_ = new QTimer(this);
		QObject::connect(timer_, &QTimer::timeout, this, [this] { poll(); });
		timer_->start(1000);
		poll();
	}

protected:
	void showEvent(QShowEvent *e) override
	{
		QDialog::showEvent(e);
		lastData_ = 0;
		poll();
	}

private:
	int port_;
	QByteArray token_;
	QNetworkAccessManager nam_;
	QTimer *timer_ = nullptr;
	qint64 lastData_ = 0;
	bool paired_ = false, built_ = false;
	QString jobDone_;
	QJsonObject state_, cloud_, optionsCache_;
	QJsonArray cols_;

	QLabel *badge_ = nullptr, *version_ = nullptr;
	QStackedWidget *root_ = nullptr, *tabs_ = nullptr;
	QPushButton *tabBtn_[3] = {};
	// connexion
	QLabel *loginText_ = nullptr, *loginCode_ = nullptr, *loginErr_ = nullptr;
	QPushButton *connect_ = nullptr, *reopen_ = nullptr;
	// direct
	QLabel *vLink_ = nullptr, *vSource_ = nullptr, *vAccess_ = nullptr, *vObs_ = nullptr;
	// collections
	QVBoxLayout *localBox_ = nullptr, *cloudBox_ = nullptr;
	QLabel *quota_ = nullptr, *job_ = nullptr;
	QProgressBar *bar_ = nullptr;
	// réglages
	QComboBox *secScene_ = nullptr, *secSource_ = nullptr;
	Switch *auto_ = nullptr;
	QLabel *host_ = nullptr, *pingOut_ = nullptr, *account_ = nullptr;
	bool loadingSettings_ = false;

	void request(const QString &method, const QString &path, const QJsonObject &body, std::function<void(const QJsonObject &)> cb)
	{
		QNetworkRequest rq(QUrl(QString("http://127.0.0.1:%1%2").arg(port_).arg(path)));
		rq.setRawHeader("X-Syxtee", token_);
		rq.setTransferTimeout(8000);
		QNetworkReply *r;
		if (method == "POST") {
			rq.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
			r = nam_.post(rq, QJsonDocument(body).toJson(QJsonDocument::Compact));
		} else {
			r = nam_.get(rq);
		}
		QObject::connect(r, &QNetworkReply::finished, this, [r, cb] {
			QJsonObject o;
			if (r->error() == QNetworkReply::NoError) o = QJsonDocument::fromJson(r->readAll()).object();
			else o["_error"] = true;
			r->deleteLater();
			if (cb) cb(o);
		});
	}
	void get(const QString &path, std::function<void(const QJsonObject &)> cb) { request("GET", path, {}, cb); }
	void post(const QString &path, const QJsonObject &body = {}, std::function<void(const QJsonObject &)> cb = nullptr) { request("POST", path, body, cb); }

	// ───── Construction ─────
	void build()
	{
		auto *outer = new QVBoxLayout(this);
		outer->setContentsMargins(22, 18, 22, 18);
		outer->setSpacing(14);

		auto *head = new QHBoxLayout;
		head->addWidget(label("SYXTEE Studio", "title"));
		badge_ = new QLabel("Hors ligne");
		badge_->setObjectName("badge");
		badge_->setProperty("ok", false);
		version_ = new QLabel("");
		version_->setObjectName("version");
		head->addStretch(1);
		head->addWidget(badge_);
		head->addWidget(version_);
		outer->addLayout(head);

		root_ = new QStackedWidget;
		outer->addWidget(root_, 1);
		root_->addWidget(buildLogin());
		root_->addWidget(buildMain());
		built_ = true;
	}

	QWidget *buildLogin()
	{
		auto *w = new QWidget;
		auto *v = new QVBoxLayout(w);
		v->setAlignment(Qt::AlignCenter);
		v->setSpacing(12);
		auto *h = label("Connecte ton compte", "h1");
		h->setAlignment(Qt::AlignCenter);
		loginText_ = label("Relie cet OBS à ton compte SYXTEE pour le piloter depuis le site, même depuis ton téléphone, et sauvegarder tes scènes.", "muted");
		loginText_->setAlignment(Qt::AlignCenter);
		loginText_->setMaximumWidth(380);
		loginCode_ = label("", "code");
		loginCode_->setAlignment(Qt::AlignCenter);
		loginErr_ = label("", "alert");
		loginErr_->hide();
		connect_ = new QPushButton("Connecter");
		connect_->setObjectName("primary");
		connect_->setCursor(Qt::PointingHandCursor);
		reopen_ = new QPushButton("Rouvrir la page dans le navigateur");
		reopen_->hide();
		QObject::connect(connect_, &QPushButton::clicked, this, [this] {
			connect_->setEnabled(false);
			post("/api/login/start", {}, [this](const QJsonObject &) { poll(); });
		});
		QObject::connect(reopen_, &QPushButton::clicked, this, [this] { post("/api/login/reopen"); });
		v->addStretch(1);
		v->addWidget(h);
		v->addWidget(loginText_, 0, Qt::AlignHCenter);
		v->addSpacing(6);
		v->addWidget(loginCode_);
		v->addWidget(loginErr_);
		v->addWidget(connect_, 0, Qt::AlignHCenter);
		v->addWidget(reopen_, 0, Qt::AlignHCenter);
		v->addStretch(2);
		return w;
	}

	QWidget *scroll(QWidget *inner)
	{
		auto *s = new QScrollArea;
		s->setWidgetResizable(true);
		s->setFrameShape(QFrame::NoFrame);
		s->setWidget(inner);
		return s;
	}

	QWidget *buildMain()
	{
		auto *w = new QWidget;
		auto *v = new QVBoxLayout(w);
		v->setContentsMargins(0, 0, 0, 0);
		v->setSpacing(10);
		auto *bar = new QHBoxLayout;
		const char *names[3] = {"DIRECT", "COLLECTIONS", "RÉGLAGES"};
		tabs_ = new QStackedWidget;
		for (int i = 0; i < 3; i++) {
			auto *b = new QPushButton(names[i]);
			b->setObjectName("tab");
			b->setCheckable(true);
			b->setCursor(Qt::PointingHandCursor);
			tabBtn_[i] = b;
			bar->addWidget(b);
			QObject::connect(b, &QPushButton::clicked, this, [this, i] { showTab(i); });
		}
		bar->addStretch(1);
		v->addLayout(bar);
		v->addWidget(sep());
		tabs_->addWidget(scroll(buildDirect()));
		tabs_->addWidget(scroll(buildCollections()));
		tabs_->addWidget(scroll(buildSettings()));
		v->addWidget(tabs_, 1);
		showTab(0);
		return w;
	}

	void showTab(int i)
	{
		for (int k = 0; k < 3; k++) tabBtn_[k]->setChecked(k == i);
		tabs_->setCurrentIndex(i);
		lastData_ = 0;
		if (i > 0) refreshData();
	}

	QWidget *page(QVBoxLayout **out)
	{
		auto *w = new QWidget;
		auto *v = new QVBoxLayout(w);
		v->setContentsMargins(0, 8, 8, 8);
		v->setSpacing(10);
		*out = v;
		return w;
	}

	QWidget *buildDirect()
	{
		QVBoxLayout *v;
		auto *w = page(&v);
		auto *note = card();
		auto *t = label("Aucune diffusion en cours.");
		auto *s = label("Les mesures apparaissent dès le démarrage du stream (débit, pertes, incidents).", "muted");
		auto *inner = static_cast<QVBoxLayout *>(note->layout());
		inner->setContentsMargins(16, 14, 16, 14);
		inner->setSpacing(4);
		inner->addWidget(t);
		inner->addWidget(s);
		v->addWidget(note);

		v->addSpacing(6);
		v->addWidget(label("CONNEXIONS", "section"));
		auto *c = card();
		vLink_ = label("—");
		vSource_ = label("En attente");
		vAccess_ = label("—");
		vObs_ = label("—");
		addRow(c, row("Liaison SYXTEE", "Cet OBS et ton compte", vLink_), true);
		addRow(c, row("OBS", "Serveur WebSocket d'OBS", vObs_));
		addRow(c, row("Source vidéo", "Flux du relais dans la scène de direct", vSource_));
		addRow(c, row("Accès au direct", "Compte autorisé sur SYXTEE", vAccess_));
		v->addWidget(c);

		v->addSpacing(6);
		v->addWidget(label("DERNIÈRES DIFFUSIONS", "section"));
		auto *h = card();
		auto *hv = static_cast<QVBoxLayout *>(h->layout());
		hv->setContentsMargins(16, 14, 16, 14);
		hv->addWidget(label("Aucune diffusion enregistrée pour le moment.", "muted"));
		v->addWidget(h);
		v->addStretch(1);
		return w;
	}

	QWidget *buildCollections()
	{
		QVBoxLayout *v;
		auto *w = page(&v);
		job_ = label("", "muted");
		job_->hide();
		v->addWidget(job_);
		v->addWidget(label("SUR CE POSTE", "section"));
		auto *c = card();
		localBox_ = new QVBoxLayout;
		localBox_->setSpacing(0);
		static_cast<QVBoxLayout *>(c->layout())->addLayout(localBox_);
		v->addWidget(c);
		v->addWidget(label("Les scènes, sources, filtres et médias partent ensemble. Les scripts Lua et Python sont exclus.", "muted"));

		v->addSpacing(8);
		v->addWidget(label("SUR SYXTEE", "section"));
		quota_ = label("—", "muted");
		bar_ = new QProgressBar;
		bar_->setRange(0, 1000);
		bar_->setTextVisible(false);
		v->addWidget(quota_);
		v->addWidget(bar_);
		auto *cc = card();
		cloudBox_ = new QVBoxLayout;
		cloudBox_->setSpacing(0);
		static_cast<QVBoxLayout *>(cc->layout())->addLayout(cloudBox_);
		v->addWidget(cc);
		v->addWidget(label("Importer ajoute la collection à cet OBS, avec ses médias, sans toucher à la collection ouverte.", "muted"));
		v->addStretch(1);
		return w;
	}

	QWidget *buildSettings()
	{
		QVBoxLayout *v;
		auto *w = page(&v);

		v->addWidget(label("DIFFUSION", "section"));
		auto *d = card();
		auto *dest = new QComboBox;
		dest->addItem("Bientôt");
		dest->setEnabled(false);
		auto *prev = new Switch;
		prev->setEnabled(false);
		addRow(d, row("Flux de destination", "Bientôt : choisir le relais qui reçoit ton direct", dest), true);
		addRow(d, row("Aperçu programme", "Bientôt : montre ton direct sur le site. Désactive-le si ton ordinateur est chargé.", prev));
		v->addWidget(d);

		v->addSpacing(6);
		v->addWidget(label("SCÈNES", "section"));
		auto *s = card();
		secScene_ = new QComboBox;
		secSource_ = new QComboBox;
		auto *live = new QComboBox;
		live->addItem("Bientôt");
		live->setEnabled(false);
		auto_ = new Switch;
		addRow(s, row("Scène de direct", "Bientôt : la scène qui contient ton flux SYXTEE", live), true);
		addRow(s, row("Source surveillée", "L'entrée OBS qui lit ton relais", secSource_));
		addRow(s, row("Scène de secours", "Affichée quand l'image se fige ou coupe", secScene_));
		addRow(s, row("Bascule automatique", "Passe sur la scène de secours, puis revient quand l'image repart", auto_));
		v->addWidget(s);
		auto saveSwitch = [this] {
			if (loadingSettings_) return;
			QJsonObject b;
			b["enabled"] = auto_->isChecked();
			b["source"] = secSource_->currentText();
			b["scene"] = secScene_->currentText();
			post("/api/switch", b);
		};
		QObject::connect(auto_, &QAbstractButton::toggled, this, saveSwitch);
		QObject::connect(secScene_, &QComboBox::activated, this, saveSwitch);
		QObject::connect(secSource_, &QComboBox::activated, this, saveSwitch);

		v->addSpacing(6);
		v->addWidget(label("CETTE MACHINE", "section"));
		auto *m = card();
		host_ = label("—", "muted");
		pingOut_ = label("", "muted");
		auto *ping = new QPushButton("Tester");
		QObject::connect(ping, &QPushButton::clicked, this, [this, ping] {
			ping->setEnabled(false);
			pingOut_->setText("Test en cours…");
			post("/api/ping", {}, [this, ping](const QJsonObject &o) {
				ping->setEnabled(true);
				pingOut_->setText(o.value("ok").toBool() ? QString("%1 ms vers SYXTEE").arg(o.value("ms").toInt()) : "Serveur injoignable");
			});
		});
		auto *pw = new QWidget;
		auto *ph = new QHBoxLayout(pw);
		ph->setContentsMargins(0, 0, 0, 0);
		ph->addWidget(pingOut_);
		ph->addWidget(ping);
		addRow(m, row("Nom du poste", "", host_), true);
		addRow(m, row("Test de connexion", "Latence vers les serveurs SYXTEE", pw));
		v->addWidget(m);

		v->addSpacing(6);
		v->addWidget(label("COMPTE", "section"));
		auto *a = card();
		account_ = label("Compte SYXTEE", "muted");
		auto *out = new QPushButton("Déconnecter");
		QObject::connect(out, &QPushButton::clicked, this, [this] { post("/api/unpair", {}, [this](const QJsonObject &) { poll(); }); });
		addRow(a, row("Compte connecté", "Cet OBS est relié à ton compte SYXTEE", out), true);
		v->addWidget(a);
		v->addStretch(1);
		return w;
	}

	// ───── Données ─────
	void poll()
	{
		if (!built_) return;
		get("/api/state", [this](const QJsonObject &s) { applyState(s); });
		if (isVisible() && QDateTime::currentMSecsSinceEpoch() - lastData_ > 15000) refreshData();
	}

	void refreshData()
	{
		lastData_ = QDateTime::currentMSecsSinceEpoch();
		if (!paired_) return;
		get("/api/collections", [this](const QJsonObject &o) {
			cols_ = o.value("collections").toArray();
			renderCollections();
		});
		get("/api/cloud", [this](const QJsonObject &o) {
			cloud_ = o;
			renderCollections();
		});
		get("/api/options", [this](const QJsonObject &o) { fillSettings(o); });
	}

	void applyState(const QJsonObject &s)
	{
		if (s.value("_error").toBool()) {
			badge_->setText("Agent injoignable");
			badge_->setProperty("ok", false);
			badge_->style()->unpolish(badge_);
			badge_->style()->polish(badge_);
			root_->setCurrentIndex(0);
			loginText_->setText("L'agent SYXTEE Link ne répond pas. Ferme OBS et rouvre-le. S'il persiste, consulte ~/.syxtee-link/helper.log.");
			connect_->setEnabled(false);
			return;
		}
		state_ = s;
		const bool paired = s.value("paired").toBool();
		const QJsonObject st = s.value("status").toObject();
		const bool coreOn = st.value("core").toString() == "on";
		version_->setText("v" + s.value("version").toString());
		const bool ok = paired && coreOn;
		badge_->setText(ok ? "Connecté" : paired ? "Connexion…" : "Non connecté");
		badge_->setProperty("ok", ok);
		badge_->style()->unpolish(badge_);
		badge_->style()->polish(badge_);
		host_->setText(s.value("host").toString());

		if (paired != paired_) {
			paired_ = paired;
			lastData_ = 0;
		}
		root_->setCurrentIndex(paired ? 1 : 0);

		// Écran de connexion : code affiché pendant l'attente.
		const QJsonObject lg = s.value("login").toObject();
		const QString ls = lg.value("state").toString();
		if (ls == "waiting") {
			QString c = lg.value("userCode").toString();
			if (c.size() == 8) c = c.left(4) + "-" + c.mid(4);
			loginCode_->setText(c);
			loginText_->setText("Autorise cet ordinateur dans la page ouverte dans ton navigateur. Le code doit être le même.");
			connect_->hide();
			reopen_->show();
			loginErr_->hide();
		} else {
			loginCode_->setText("");
			connect_->show();
			connect_->setEnabled(true);
			reopen_->hide();
			if (ls == "error") {
				loginErr_->setText(lg.value("message").toString());
				loginErr_->show();
			} else loginErr_->hide();
		}

		vLink_->setText(coreOn ? "Connectée" : st.value("core").toString() == "connecting" ? "Connexion…" : "Hors ligne");
		vObs_->setText(st.value("obs").toString() == "on" ? "Connecté · OBS " + st.value("obsVersion").toString() : "Non joignable (active le serveur WebSocket d'OBS)");
		vAccess_->setText(coreOn ? "Actif" : "—");

		const QJsonObject job = st.value("job").toObject();
		if (!job.isEmpty() && job.value("state").toString() != "idle") {
			job_->setText(job.value("message").toString());
			job_->show();
			if (job.value("state").toString() == "done" && jobDone_ != job.value("message").toString()) {
				jobDone_ = job.value("message").toString();
				lastData_ = 0;
				refreshData();
			}
		} else job_->hide();
	}

	void renderCollections()
	{
		if (!localBox_) return;
		const QJsonArray backups = cloud_.value("backups").toArray();
		const bool running = state_.value("status").toObject().value("job").toObject().value("state").toString() == "running";
		clear(localBox_);
		if (cols_.isEmpty()) localBox_->addWidget(row("Aucune collection trouvée", "Ouvre OBS pour créer une collection de scènes.", nullptr));
		bool first = true;
		for (const auto &cv : cols_) {
			const QJsonObject c = cv.toObject();
			const QString name = c.value("name").toString();
			QString last;
			for (const auto &bv : backups) {
				const QJsonObject b = bv.toObject();
				if (b.value("collection").toString() == name) {
					last = QDateTime::fromString(b.value("created_at").toString(), Qt::ISODate).toLocalTime().toString("dd/MM HH:mm");
					break;
				}
			}
			auto *btn = new QPushButton("Sauvegarder");
			btn->setEnabled(!running);
			QObject::connect(btn, &QPushButton::clicked, this, [this, name] {
				QJsonObject b;
				b["collection"] = name;
				post("/api/backup", b, [this](const QJsonObject &) { poll(); });
			});
			const QString sub = (last.isEmpty() ? QString("Jamais sauvegardée") : "Sauvegardée le " + last) + " · " + QString::number(c.value("media").toInt()) + " médias · " + fmtSize(c.value("bytes").toDouble());
			if (!first) localBox_->addWidget(sep());
			localBox_->addWidget(row(name, sub, btn));
			first = false;
		}

		clear(cloudBox_);
		if (cloud_.contains("error")) {
			quota_->setText(cloud_.value("error").toString());
			bar_->setValue(0);
		} else {
			const double used = cloud_.value("used").toDouble(), quota = cloud_.value("quota").toDouble(5.0 * 1024 * 1024 * 1024);
			quota_->setText(fmtSize(used) + " sur " + fmtSize(quota));
			bar_->setValue(int(qMin(1.0, used / quota) * 1000));
		}
		if (backups.isEmpty()) cloudBox_->addWidget(row("Aucune sauvegarde", "Sauvegarde une collection pour la retrouver ici.", nullptr));
		first = true;
		for (const auto &bv : backups) {
			const QJsonObject b = bv.toObject();
			const QString id = b.value("id").toString();
			auto *btn = new QPushButton("Importer");
			btn->setEnabled(!running);
			QObject::connect(btn, &QPushButton::clicked, this, [this, id] {
				QJsonObject o;
				o["id"] = id;
				post("/api/restore", o, [this](const QJsonObject &) { poll(); });
			});
			const QString date = QDateTime::fromString(b.value("created_at").toString(), Qt::ISODate).toLocalTime().toString("dd/MM HH:mm");
			QString sub = date + " · " + fmtSize(b.value("size").toDouble()) + " · v" + QString::number(b.value("version").toInt(1));
			if (!b.value("host").toString().isEmpty()) sub += " · " + b.value("host").toString();
			if (!first) cloudBox_->addWidget(sep());
			cloudBox_->addWidget(row(b.value("collection").toString().isEmpty() ? b.value("name").toString() : b.value("collection").toString(), sub, btn));
			first = false;
		}
	}

	void fillSettings(const QJsonObject &o)
	{
		loadingSettings_ = true;
		const QJsonObject b = state_.value("backup").toObject();
		auto fill = [](QComboBox *c, const QJsonArray &items, const QString &cur) {
			c->clear();
			c->addItem("");
			for (const auto &i : items) c->addItem(i.toString());
			c->setCurrentText(cur);
		};
		fill(secScene_, o.value("scenes").toArray(), b.value("scene").toString());
		fill(secSource_, o.value("inputs").toArray(), b.value("source").toString());
		auto_->setChecked(b.value("enabled").toBool());
		loadingSettings_ = false;
	}
};

} // namespace

QWidget *syxtee_create_window(QWidget *parent, int port, const QByteArray &token)
{
	return new Studio(parent, port, token);
}
