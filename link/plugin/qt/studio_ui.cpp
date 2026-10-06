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
#include <QLineEdit>
#include <QPainterPath>
#include <QPixmap>
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
QLineEdit { background: #15171c; color: #f2f3f5; border: 1px solid rgba(255,255,255,0.16); border-radius: 8px; padding: 6px 10px; min-width: 190px; font-size: 12px; }
QLabel#ok { color: #9aa0ab; font-size: 12px; }
QProgressBar { background: #23262d; border: none; border-radius: 3px; max-height: 6px; min-height: 6px; }
QProgressBar::chunk { background: #f2f3f5; border-radius: 3px; }
QScrollArea { background: transparent; border: none; }
QScrollArea > QWidget > QWidget { background: transparent; }
QScrollBar:vertical { background: transparent; width: 8px; }
QScrollBar::handle:vertical { background: rgba(255,255,255,0.16); border-radius: 4px; min-height: 24px; }
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
)";

// Tailles en unités binaires affichées « Go / Mo / Ko » (le quota de 5 Go est 5 × 1024³ octets).
QString fmtSize(double n)
{
	const double go = 1024.0 * 1024 * 1024, mo = 1024.0 * 1024;
	if (n >= go) return QString::number(n / go, 'f', n >= 10 * go || qFuzzyCompare(n / go, qRound(n / go) + 0.0) ? 0 : 1) + " Go";
	if (n >= mo) return QString::number(n / mo, 'f', 0) + " Mo";
	return QString::number(qMax(1.0, n / 1024.0), 'f', 0) + " Ko";
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
	bool paired_ = false, built_ = false, obsOn_ = false;
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
	QLabel *vLink_ = nullptr, *vSource_ = nullptr, *vAccess_ = nullptr;
	// collections
	QVBoxLayout *localBox_ = nullptr, *cloudBox_ = nullptr;
	QLabel *quota_ = nullptr, *job_ = nullptr;
	QProgressBar *bar_ = nullptr;
	// réglages
	QComboBox *secScene_ = nullptr, *secSource_ = nullptr, *liveScene_ = nullptr, *dest_ = nullptr;
	QWidget *destEmpty_ = nullptr, *liveAlert_ = nullptr;
	QLabel *liveAlertText_ = nullptr, *fixOut_ = nullptr, *hostOut_ = nullptr;
	QPushButton *fixBtn_ = nullptr;
	Switch *auto_ = nullptr;
	QLineEdit *hostEdit_ = nullptr;
	QLabel *pingOut_ = nullptr, *accName_ = nullptr, *accMail_ = nullptr, *avatar_ = nullptr;
	QString avatarUrl_, hostSaved_;
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
		addRow(c, row("Liaison SYXTEE", "Cet OBS et ton compte", vLink_), true);
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

		// DIFFUSION : flux (relais) du compte. Aperçu programme arrive avec l'étape suivante.
		v->addWidget(label("DIFFUSION", "section"));
		auto *d = card();
		dest_ = new QComboBox;
		auto *create = new QPushButton("Créer un relais");
		QObject::connect(create, &QPushButton::clicked, this, [] { QDesktopServices::openUrl(QUrl("https://syxtee-networks.vercel.app/dashboard/relais")); });
		auto *destBox = new QWidget;
		auto *dh = new QHBoxLayout(destBox);
		dh->setContentsMargins(0, 0, 0, 0);
		dh->addWidget(dest_);
		destEmpty_ = create;
		dh->addWidget(create);
		auto *soon = label("Disponible bientôt", "muted");
		soon->setWordWrap(false);
		addRow(d, row("Flux de destination", "Le relais que lit la source « Flux SYXTEE » dans ta scène de direct", destBox), true);
		addRow(d, row("Aperçu programme", "Montre ton direct sur le site. Tu pourras le désactiver si ton ordinateur est chargé.", soon));
		v->addWidget(d);
		QObject::connect(dest_, &QComboBox::activated, this, [this](int i) {
			QJsonObject b;
			b["id"] = dest_->itemData(i).toString();
			post("/api/destination", b, [this](const QJsonObject &) { refreshLive(); });
		});

		// SCÈNES
		v->addSpacing(6);
		v->addWidget(label("SCÈNES", "section"));
		auto *s = card();
		secScene_ = new QComboBox;
		secSource_ = new QComboBox;
		liveScene_ = new QComboBox;
		auto_ = new Switch;
		addRow(s, row("Scène de direct", "La scène qui contient ton flux SYXTEE", liveScene_), true);
		liveAlert_ = new QWidget;
		auto *la = new QVBoxLayout(liveAlert_);
		la->setContentsMargins(0, 4, 0, 10);
		auto *box = new QFrame;
		box->setObjectName("alertbox");
		box->setStyleSheet("QFrame#alertbox { background: rgba(217,45,45,0.14); border: 1px solid rgba(217,45,45,0.45); border-radius: 10px; } QLabel { color: #ff8a80; font-size: 12px; }");
		auto *bh = new QHBoxLayout(box);
		bh->setContentsMargins(12, 10, 12, 10);
		liveAlertText_ = label("");
		fixBtn_ = new QPushButton("Corriger");
		fixBtn_->setObjectName("primary");
		bh->addWidget(liveAlertText_, 1);
		bh->addWidget(fixBtn_, 0, Qt::AlignVCenter);
		la->addWidget(box);
		liveAlert_->hide();
		static_cast<QVBoxLayout *>(s->layout())->addWidget(liveAlert_);
		fixOut_ = label("", "ok");
		fixOut_->hide();
		static_cast<QVBoxLayout *>(s->layout())->addWidget(fixOut_);
		addRow(s, row("Source surveillée", "L'entrée OBS qui lit ton relais", secSource_));
		addRow(s, row("Scène de secours", "Affichée quand l'image se fige ou coupe", secScene_));
		addRow(s, row("Bascule automatique", "Passe sur la scène de secours, puis revient quand l'image repart", auto_));
		v->addWidget(s);
		QObject::connect(liveScene_, &QComboBox::activated, this, [this] {
			QJsonObject b;
			b["scene"] = liveScene_->currentData().toString();
			post("/api/live-scene", b, [this](const QJsonObject &) { refreshLive(); });
		});
		QObject::connect(fixBtn_, &QPushButton::clicked, this, [this] {
			fixBtn_->setEnabled(false);
			post("/api/fix", {}, [this](const QJsonObject &o) {
				fixBtn_->setEnabled(true);
				fixOut_->setText(o.value("message").toString(o.value("_error").toBool() ? "Agent injoignable." : ""));
				fixOut_->show();
				lastData_ = 0;
				refreshData();
			});
		});
		auto saveSwitch = [this] {
			if (loadingSettings_) return;
			QJsonObject b;
			b["enabled"] = auto_->isChecked();
			b["source"] = secSource_->currentData().toString();
			b["scene"] = secScene_->currentData().toString();
			post("/api/switch", b);
		};
		QObject::connect(auto_, &QAbstractButton::toggled, this, saveSwitch);
		QObject::connect(secScene_, &QComboBox::activated, this, saveSwitch);
		QObject::connect(secSource_, &QComboBox::activated, this, saveSwitch);

		// CETTE MACHINE
		v->addSpacing(6);
		v->addWidget(label("CETTE MACHINE", "section"));
		auto *m = card();
		hostEdit_ = new QLineEdit;
		hostEdit_->setMaxLength(40);
		hostOut_ = label("", "ok");
		hostOut_->setWordWrap(false);
		auto *save = new QPushButton("Enregistrer");
		auto doRename = [this, save] {
			const QString n = hostEdit_->text().trimmed();
			if (n.isEmpty()) return;
			save->setEnabled(false);
			QJsonObject b;
			b["name"] = n;
			post("/api/rename", b, [this, save](const QJsonObject &o) {
				save->setEnabled(true);
				hostOut_->setText(o.value("ok").toBool() ? "Enregistré" : o.value("error").toString("Échec"));
				hostEdit_->setText(o.value("ok").toBool() ? o.value("name").toString() : hostEdit_->text());
			});
		};
		QObject::connect(save, &QPushButton::clicked, this, doRename);
		QObject::connect(hostEdit_, &QLineEdit::returnPressed, this, doRename);
		auto *hw = new QWidget;
		auto *hh = new QHBoxLayout(hw);
		hh->setContentsMargins(0, 0, 0, 0);
		hh->addWidget(hostEdit_);
		hh->addWidget(save);
		pingOut_ = label("", "muted");
		pingOut_->setWordWrap(false);
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
		addRow(m, row("Nom du poste", "Affiché sur le site, dans Mes OBS et Contrôle à distance", hw), true);
		m->layout()->addWidget(hostOut_);
		addRow(m, row("Test de connexion", "Latence vers les serveurs SYXTEE", pw));
		v->addWidget(m);

		// COMPTE
		v->addSpacing(6);
		v->addWidget(label("COMPTE", "section"));
		auto *a = card();
		avatar_ = new QLabel;
		avatar_->setFixedSize(44, 44);
		accName_ = label("Compte SYXTEE");
		accMail_ = label("", "muted");
		auto *out = new QPushButton("Déconnecter");
		QObject::connect(out, &QPushButton::clicked, this, [this] { post("/api/unpair", {}, [this](const QJsonObject &) { poll(); }); });
		auto *aw = new QWidget;
		auto *ah = new QHBoxLayout(aw);
		ah->setContentsMargins(0, 10, 0, 10);
		ah->setSpacing(12);
		ah->addWidget(avatar_);
		auto *at = new QVBoxLayout;
		at->setSpacing(2);
		at->addWidget(accName_);
		at->addWidget(accMail_);
		ah->addLayout(at, 1);
		ah->addWidget(out, 0, Qt::AlignVCenter);
		static_cast<QVBoxLayout *>(a->layout())->addWidget(aw);
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
		get("/api/streams", [this](const QJsonObject &o) { fillStreams(o); });
		get("/api/account", [this](const QJsonObject &o) { fillAccount(o); });
		refreshLive();
	}

	void refreshLive()
	{
		if (!paired_) return;
		get("/api/live", [this](const QJsonObject &o) {
			const bool chosen = !o.value("scene").toString().isEmpty();
			const bool has = o.value("hasSource").toBool();
			const bool obsOn = o.value("obs").toBool(true);
			liveAlert_->setVisible(chosen && obsOn && !has);
			if (chosen && obsOn && !has) {
				const bool dest = o.value("destination").toBool();
				liveAlertText_->setText(dest ? "Aucune source « Flux SYXTEE » dans la scène de direct. Sans elle, SYXTEE ne peut pas détecter une coupure."
							     : "Aucune source « Flux SYXTEE » dans la scène de direct. Choisis d'abord un flux de destination, puis clique sur Corriger.");
			}
			if (has) fixOut_->hide();
		});
	}

	void fillStreams(const QJsonObject &o)
	{
		loadingSettings_ = true;
		dest_->clear();
		const QJsonArray arr = o.value("streams").toArray();
		const QString sel = o.value("selected").toString();
		if (!sel.isEmpty() || !arr.isEmpty()) dest_->addItem("Choisir un flux…", "");
		for (const auto &sv : arr) {
			const QJsonObject st = sv.toObject();
			dest_->addItem(st.value("name").toString() + " · " + st.value("protocol").toString().toUpper() + (st.value("live").toBool() ? " · en direct" : ""), st.value("id").toString());
		}
		const int idx = dest_->findData(sel);
		dest_->setCurrentIndex(idx >= 0 ? idx : 0);
		const bool empty = arr.isEmpty();
		dest_->setVisible(!empty);
		destEmpty_->setVisible(empty);
		loadingSettings_ = false;
	}

	void fillAccount(const QJsonObject &o)
	{
		if (o.contains("error")) {
			accName_->setText("Compte SYXTEE");
			accMail_->setText(o.value("error").toString());
			return;
		}
		const QString name = o.value("name").toString();
		if (!hostEdit_->hasFocus() && !o.value("device_name").toString().isEmpty() && o.value("device_name").toString() != hostSaved_) {
			hostSaved_ = o.value("device_name").toString();
			hostEdit_->setText(hostSaved_);
		}
		accName_->setText(name);
		accMail_->setText(o.value("email").toString());
		const QString url = o.value("avatar_url").toString();
		if (url == avatarUrl_ && avatar_->pixmap().cacheKey() != 0) return;
		avatarUrl_ = url;
		setAvatar(QPixmap(), name);
		if (url.startsWith("https://")) {
			QNetworkReply *r = nam_.get(QNetworkRequest(QUrl(url)));
			QObject::connect(r, &QNetworkReply::finished, this, [this, r, name] {
				QPixmap px;
				if (r->error() == QNetworkReply::NoError) px.loadFromData(r->readAll());
				r->deleteLater();
				if (!px.isNull()) setAvatar(px, name);
			});
		}
	}

	// Avatar rond : image du compte, sinon l'initiale sur fond neutre.
	void setAvatar(const QPixmap &src, const QString &name)
	{
		const int n = 44;
		QPixmap out(n, n);
		out.fill(Qt::transparent);
		QPainter p(&out);
		p.setRenderHint(QPainter::Antialiasing);
		QPainterPath clip;
		clip.addEllipse(0, 0, n, n);
		p.setClipPath(clip);
		if (!src.isNull()) {
			p.drawPixmap(0, 0, src.scaled(n, n, Qt::KeepAspectRatioByExpanding, Qt::SmoothTransformation));
		} else {
			p.fillRect(0, 0, n, n, QColor("#23262d"));
			p.setPen(QColor("#f2f3f5"));
			QFont f = p.font();
			f.setPixelSize(18);
			f.setBold(true);
			p.setFont(f);
			p.drawText(QRect(0, 0, n, n), Qt::AlignCenter, name.left(1).toUpper());
		}
		avatar_->setPixmap(out);
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
		if (hostEdit_ && hostEdit_->text().isEmpty()) hostEdit_->setText(s.value("host").toString()); // remplacé par le nom du registre dès qu'il arrive

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
		// OBS vient de devenir joignable : on recharge scènes, sources et diagnostic de la scène de direct.
		const bool obsNow = st.value("obs").toString() == "on";
		if (obsNow && !obsOn_) lastData_ = 0;
		obsOn_ = obsNow;
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
			// Dernière sauvegarde : la plus récente entre celle de ce poste (gardée dans sa config) et celles de l'espace SYXTEE.
			QDateTime best = QDateTime::fromString(state_.value("lastBackup").toObject().value(name).toString(), Qt::ISODate);
			for (const auto &bv : backups) {
				const QJsonObject b = bv.toObject();
				if (b.value("collection").toString() != name) continue;
				const QDateTime t = QDateTime::fromString(b.value("created_at").toString(), Qt::ISODate);
				if (!best.isValid() || t > best) best = t;
			}
			const QString last = best.isValid() ? best.toLocalTime().toString("dd/MM HH:mm") : QString();
			auto *btn = new QPushButton("Sauvegarder");
			btn->setEnabled(!running);
			QObject::connect(btn, &QPushButton::clicked, this, [this, name] {
				QJsonObject b;
				b["collection"] = name;
				post("/api/backup", b, [this](const QJsonObject &) { poll(); });
			});
			auto *sw = new Switch;
			sw->setChecked(state_.value("autoBackup").toObject().value(name).toBool());
			sw->setToolTip("Sauvegarde automatique à chaque modification de la collection");
			QObject::connect(sw, &QAbstractButton::toggled, this, [this, name](bool on) {
				QJsonObject b;
				b["collection"] = name;
				b["enabled"] = on;
				post("/api/auto", b);
			});
			auto *ctl = new QWidget;
			auto *ch = new QHBoxLayout(ctl);
			ch->setContentsMargins(0, 0, 0, 0);
			ch->setSpacing(10);
			auto *auto_ = label("Auto", "muted");
			auto_->setWordWrap(false);
			ch->addWidget(auto_);
			ch->addWidget(sw);
			ch->addWidget(btn);
			const QString sub = (last.isEmpty() ? QString("Jamais sauvegardée") : "Sauvegardée le " + last) + " · " + QString::number(c.value("media").toInt()) + " médias · " + fmtSize(c.value("bytes").toDouble());
			if (!first) localBox_->addWidget(sep());
			localBox_->addWidget(row(name, sub, ctl));
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
			c->addItem("Choisir…", "");
			for (const auto &i : items) c->addItem(i.toString(), i.toString());
			const int idx = c->findData(cur);
			c->setCurrentIndex(idx >= 0 ? idx : 0);
		};
		fill(liveScene_, o.value("scenes").toArray(), state_.value("liveScene").toString());
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
