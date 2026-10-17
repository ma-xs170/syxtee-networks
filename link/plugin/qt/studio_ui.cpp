#include "studio_ui.h"

#include <QAbstractButton>
#include <QComboBox>
#include <QDateTime>
#include <QDesktopServices>
#include <QDialog>
#include <QFontDatabase>
#include <QFrame>
#include <QGridLayout>
#include <QHBoxLayout>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QLabel>
#include <QLayoutItem>
#include <QLineEdit>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QPainter>
#include <QPainterPath>
#include <QPixmap>
#include <QProgressBar>
#include <QPushButton>
#include <QResizeEvent>
#include <QScrollArea>
#include <QShortcut>
#include <QStackedWidget>
#include <QStyle>
#include <QTimer>
#include <QVBoxLayout>
#include <QVariantAnimation>
#include <functional>

#include "studio_assets.h"

namespace {

// Charte du site (globals.css) : noir #050505, cartes #0b0b0b, filets blancs à 10 %, un seul fond blanc pour l'action principale.
// Vert = en ordre / en direct, ambre = à regarder, rouge = erreur, bleu = interrupteur. Les polices (Inter, Geist Mono) viennent du système :
// on demande les familles du site en premier, puis celles de la machine. Les propriétés de police des libellés « mono » sont posées dans
// le code (monoFont) et non dans la feuille de style, qui l'emporterait.
const char *kSite = "https://syxtee-networks.vercel.app";

const char *kStyle = R"(
QDialog { background: #050505; }
QWidget { color: #ffffff; }
QLabel { color: #ffffff; font-size: 13px; background: transparent; }
QLabel#title { font-size: 13px; font-weight: 700; }
QLabel#muted { color: #a3a3a3; font-size: 12px; }
QLabel#section { color: #737373; }
QLabel#meta { color: #737373; }
QLabel#hint { color: #737373; font-size: 12px; }
QLabel#h1 { font-size: 22px; font-weight: 600; }
QLabel#name { font-size: 13px; font-weight: 500; }
QLabel#value { font-size: 15px; font-weight: 600; }
QLabel#big { font-size: 22px; font-weight: 600; }
QLabel#version { color: #737373; }
QLabel#code { color: #ffffff; }
QLabel#ok { color: #a3a3a3; font-size: 12px; }
QLabel#chip { color: #a3a3a3; border: 1px solid rgba(255,255,255,0.2); border-radius: 9px; padding: 2px 8px; background: transparent; }
QLabel#chip[tone="ok"] { color: #4ade80; border-color: rgba(74,222,128,0.4); background: rgba(74,222,128,0.08); }
QLabel#chip[tone="warn"] { color: #fbbf24; border-color: rgba(251,191,36,0.4); background: rgba(251,191,36,0.08); }
QLabel#chip[tone="bad"] { color: #f87171; border-color: rgba(248,113,113,0.4); background: rgba(248,113,113,0.08); }
QLabel#alert { background: rgba(248,113,113,0.1); color: #fca5a5; border: 1px solid rgba(248,113,113,0.4); border-radius: 12px; padding: 10px 12px; font-size: 12px; }
QLabel#toast { background: #101010; color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 14px; padding: 8px 16px; font-size: 12px; }
QLabel#toast[tone="ok"] { border-color: rgba(74,222,128,0.5); }
QLabel#toast[tone="bad"] { border-color: rgba(248,113,113,0.5); }
QFrame#card, QFrame#hero, QFrame#tile { background: #0b0b0b; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; }
QFrame#notice { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.4); border-radius: 12px; }
QFrame#notice QLabel { color: #fcd34d; font-size: 12px; }
QFrame#pill { background: #0b0b0b; border: 1px solid rgba(255,255,255,0.1); border-radius: 11px; }
QFrame#sep { background: rgba(255,255,255,0.1); max-height: 1px; min-height: 1px; border: none; }
QFrame#rule { background: rgba(255,255,255,0.1); max-width: 1px; min-width: 1px; border: none; }
QPushButton { background: transparent; color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 13px; padding: 7px 16px; font-size: 12px; font-weight: 500; }
QPushButton:hover { background: rgba(255,255,255,0.08); }
QPushButton:pressed { background: rgba(255,255,255,0.14); }
QPushButton:focus { border-color: rgba(255,255,255,0.55); }
QPushButton:disabled { color: #525252; border-color: rgba(255,255,255,0.08); }
QPushButton#primary { background: #ffffff; color: #050505; border: 1px solid #ffffff; padding: 10px 24px; font-size: 13px; font-weight: 600; border-radius: 18px; }
QPushButton#primary:hover { background: #e5e5e5; border-color: #e5e5e5; }
QPushButton#primary:pressed { background: #d4d4d4; }
QPushButton#primary:disabled { background: #262626; color: #737373; border-color: #262626; }
QPushButton#small { padding: 5px 14px; border-radius: 11px; }
QPushButton#danger:hover { color: #f87171; border-color: rgba(248,113,113,0.5); background: rgba(248,113,113,0.08); }
QPushButton#link { border: none; background: transparent; color: #a3a3a3; padding: 4px 0; text-align: left; }
QPushButton#link:hover { color: #ffffff; background: transparent; }
QPushButton#tab { border: none; border-bottom: 2px solid transparent; border-radius: 0; padding: 10px 2px; margin-right: 22px; color: #737373; background: transparent; }
QPushButton#tab:hover { background: transparent; color: #d4d4d4; }
QPushButton#tab:checked { color: #ffffff; border-bottom: 2px solid #ffffff; }
QComboBox { background: #101010; color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 6px 30px 6px 12px; min-width: 150px; font-size: 12px; }
QComboBox:hover { border-color: rgba(255,255,255,0.35); }
QComboBox:focus { border-color: rgba(255,255,255,0.55); }
QComboBox:disabled { color: #525252; border-color: rgba(255,255,255,0.08); }
QComboBox::drop-down { border: none; width: 28px; }
QComboBox QAbstractItemView { background: #101010; color: #ffffff; selection-background-color: #262626; selection-color: #ffffff; border: 1px solid rgba(255,255,255,0.2); outline: none; padding: 4px; }
QLineEdit { background: #101010; color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 7px 12px; min-width: 190px; font-size: 12px; selection-background-color: #3b82f6; }
QLineEdit:hover { border-color: rgba(255,255,255,0.35); }
QLineEdit:focus { border-color: rgba(255,255,255,0.55); }
QProgressBar { background: rgba(255,255,255,0.1); border: none; border-radius: 3px; max-height: 6px; min-height: 6px; }
QProgressBar::chunk { background: #ffffff; border-radius: 3px; }
QProgressBar[tone="warn"]::chunk { background: #fbbf24; }
QProgressBar[tone="bad"]::chunk { background: #f87171; }
QScrollArea { background: transparent; border: none; }
QScrollArea > QWidget > QWidget { background: transparent; }
QScrollBar:vertical { background: transparent; width: 8px; margin: 2px; }
QScrollBar::handle:vertical { background: rgba(255,255,255,0.2); border-radius: 3px; min-height: 28px; }
QScrollBar::handle:vertical:hover { background: rgba(255,255,255,0.35); }
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: transparent; }
QToolTip { background: #101010; color: #ffffff; border: 1px solid rgba(255,255,255,0.2); padding: 4px 8px; }
)";

const QColor kOk("#4ade80"), kWarn("#fbbf24"), kBad("#f87171"), kFaint("#737373"), kInfo("#3b82f6");

// Tailles en unités binaires affichées « Go / Mo / Ko » (le quota de 5 Go est 5 × 1024³ octets).
QString fmtSize(double n)
{
	const double go = 1024.0 * 1024 * 1024, mo = 1024.0 * 1024;
	if (n >= go) return QString::number(n / go, 'f', n >= 10 * go || qFuzzyCompare(n / go, qRound(n / go) + 0.0) ? 0 : 1) + " Go";
	if (n >= mo) return QString::number(n / mo, 'f', 0) + " Mo";
	return QString::number(qMax(1.0, n / 1024.0), 'f', 0) + " Ko";
}

// Inter et Geist Mono sont ceux du site mais ne sont pas installés sur la machine : on les charge depuis le plugin.
void loadAssets()
{
	static bool done = false;
	if (done) return;
	done = true;
	auto add = [](const unsigned char *d, unsigned n) { QFontDatabase::addApplicationFontFromData(QByteArray(reinterpret_cast<const char *>(d), int(n))); };
	add(k_i4, k_i4_len);
	add(k_i5, k_i5_len);
	add(k_i6, k_i6_len);
	add(k_m4, k_m4_len);
	add(k_m5, k_m5_len);
}

QFont sansFont(int px, int weight = 400, qreal spacing = 0)
{
	QFont f;
	f.setFamilies({"Inter", "SF Pro Text", ".AppleSystemUIFont", "Segoe UI", "sans-serif"});
	f.setPixelSize(px);
	f.setWeight(QFont::Weight(weight));
	if (spacing != 0) f.setLetterSpacing(QFont::AbsoluteSpacing, spacing);
	return f;
}

QFont monoFont(int px, qreal spacing = 0, bool bold = false)
{
	QFont f;
	f.setFamilies({"Geist Mono", "SF Mono", "Menlo", "Consolas", "monospace"});
	f.setPixelSize(px);
	f.setBold(bold);
	if (spacing != 0) f.setLetterSpacing(QFont::AbsoluteSpacing, spacing);
	return f;
}

void setTone(QWidget *w, const char *tone)
{
	w->setProperty("tone", tone);
	w->style()->unpolish(w);
	w->style()->polish(w);
}

QLabel *label(const QString &text, const char *name = nullptr)
{
	auto *l = new QLabel(text);
	if (name) {
		l->setObjectName(name);
		const QString n = name;
		if (n == "section") l->setFont(monoFont(10, 1.8));
		else if (n == "meta" || n == "version") l->setFont(monoFont(11, 0.2));
		else if (n == "code") l->setFont(monoFont(30, 7, true));
		else if (n == "chip") l->setFont(monoFont(10, 1.2));
	}
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

// Pastille d'état : pleine (vert / ambre / rouge), creuse (à faire), avec un halo qui respire pour « en cours ».
class Dot : public QWidget {
public:
	explicit Dot(int h = 14, QWidget *parent = nullptr) : QWidget(parent)
	{
		setFixedSize(14, h);
		anim_ = new QVariantAnimation(this);
		anim_->setStartValue(0.0);
		anim_->setEndValue(1.0);
		anim_->setDuration(1500);
		anim_->setLoopCount(-1);
		QObject::connect(anim_, &QVariantAnimation::valueChanged, this, [this](const QVariant &v) { phase_ = v.toReal(); update(); });
	}
	void set(const QColor &c, bool hollow = false, bool pulse = false)
	{
		color_ = c;
		hollow_ = hollow;
		if (pulse && anim_->state() != QAbstractAnimation::Running) anim_->start();
		if (!pulse && anim_->state() == QAbstractAnimation::Running) { anim_->stop(); phase_ = 0; }
		update();
	}
protected:
	void paintEvent(QPaintEvent *) override
	{
		QPainter p(this);
		p.setRenderHint(QPainter::Antialiasing);
		const QPointF c(width() / 2.0, height() / 2.0);
		if (anim_->state() == QAbstractAnimation::Running) {
			QColor halo = color_;
			halo.setAlphaF(0.35 * (1.0 - phase_));
			p.setPen(Qt::NoPen);
			p.setBrush(halo);
			p.drawEllipse(c, 3.5 + 3.5 * phase_, 3.5 + 3.5 * phase_);
		}
		if (hollow_) {
			p.setPen(QPen(color_, 1.5));
			p.setBrush(Qt::NoBrush);
			p.drawEllipse(c, 3.2, 3.2);
		} else {
			p.setPen(Qt::NoPen);
			p.setBrush(color_);
			p.drawEllipse(c, 3.8, 3.8);
		}
	}
private:
	QColor color_ = kFaint;
	bool hollow_ = false;
	qreal phase_ = 0;
	QVariantAnimation *anim_ = nullptr;
};

// Segments de progression (étapes prêtes sur étapes requises).
class Segments : public QWidget {
public:
	explicit Segments(int n, QWidget *parent = nullptr) : QWidget(parent), n_(n) { setFixedHeight(4); }
	void set(int done, const QColor &c)
	{
		done_ = done;
		color_ = c;
		update();
	}
protected:
	void paintEvent(QPaintEvent *) override
	{
		QPainter p(this);
		p.setRenderHint(QPainter::Antialiasing);
		p.setPen(Qt::NoPen);
		const int gap = 6;
		const double w = (width() - gap * (n_ - 1)) / double(n_);
		for (int i = 0; i < n_; i++) {
			p.setBrush(i < done_ ? color_ : QColor(255, 255, 255, 28));
			p.drawRoundedRect(QRectF(i * (w + gap), 0, w, height()), 2, 2);
		}
	}
private:
	int n_, done_ = 0;
	QColor color_ = kOk;
};

// Interrupteur : bleu quand actif (comme sur le site), la bille glisse.
class Switch : public QAbstractButton {
public:
	explicit Switch(QWidget *parent = nullptr) : QAbstractButton(parent)
	{
		setCheckable(true);
		setCursor(Qt::PointingHandCursor);
		setFocusPolicy(Qt::TabFocus);
		setFixedSize(40, 24);
		anim_ = new QVariantAnimation(this);
		anim_->setDuration(140);
		anim_->setEasingCurve(QEasingCurve::OutCubic);
		QObject::connect(anim_, &QVariantAnimation::valueChanged, this, [this](const QVariant &v) { pos_ = v.toReal(); update(); });
		QObject::connect(this, &QAbstractButton::toggled, this, [this](bool on) {
			anim_->stop();
			anim_->setStartValue(pos_);
			anim_->setEndValue(on ? 1.0 : 0.0);
			anim_->start();
		});
	}
protected:
	void paintEvent(QPaintEvent *) override
	{
		QPainter p(this);
		p.setRenderHint(QPainter::Antialiasing);
		const qreal a = isEnabled() ? 1.0 : 0.4;
		p.setOpacity(a);
		QColor off(255, 255, 255, 36);
		QColor track = QColor(int(off.red() + (kInfo.red() - off.red()) * pos_), int(off.green() + (kInfo.green() - off.green()) * pos_),
				      int(off.blue() + (kInfo.blue() - off.blue()) * pos_), int(off.alpha() + (255 - off.alpha()) * pos_));
		p.setPen(Qt::NoPen);
		p.setBrush(track);
		p.drawRoundedRect(QRectF(0.5, 0.5, width() - 1, height() - 1), height() / 2.0, height() / 2.0);
		const qreal d = height() - 8;
		p.setBrush(QColor("#ffffff"));
		p.drawEllipse(QRectF(4 + (width() - 8 - d) * pos_, 4, d, d));
		if (hasFocus()) {
			p.setBrush(Qt::NoBrush);
			p.setPen(QPen(QColor(255, 255, 255, 140), 1.5));
			p.drawRoundedRect(QRectF(-0.5, -0.5, width() + 1, height() + 1), height() / 2.0 + 1, height() / 2.0 + 1);
		}
	}
private:
	qreal pos_ = 0;
	QVariantAnimation *anim_ = nullptr;
};

// Liste déroulante : le style de Qt supprime la flèche, on la redessine.
class Combo : public QComboBox {
public:
	using QComboBox::QComboBox;
protected:
	void paintEvent(QPaintEvent *e) override
	{
		QComboBox::paintEvent(e);
		QPainter p(this);
		p.setRenderHint(QPainter::Antialiasing);
		p.setPen(QPen(isEnabled() ? QColor("#a3a3a3") : QColor("#525252"), 1.5, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));
		const double x = width() - 17, y = height() / 2.0;
		p.drawPolyline(QPolygonF({QPointF(x - 3.5, y - 1.5), QPointF(x, y + 2), QPointF(x + 3.5, y - 1.5)}));
	}
};

QFrame *card()
{
	auto *f = new QFrame;
	f->setObjectName("card");
	auto *v = new QVBoxLayout(f);
	v->setContentsMargins(18, 4, 18, 4);
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
QWidget *row(const QString &title, const QString &sub, QWidget *right, bool meta = false)
{
	auto *w = new QWidget;
	auto *h = new QHBoxLayout(w);
	h->setContentsMargins(0, 12, 0, 12);
	h->setSpacing(16);
	auto *left = new QVBoxLayout;
	left->setSpacing(3);
	left->addWidget(label(title, "name"));
	if (!sub.isEmpty()) left->addWidget(label(sub, "muted"));
	h->addLayout(left, 1);
	if (auto *combo = qobject_cast<QComboBox *>(right)) combo->setFixedWidth(285);
	if (right) h->addWidget(right, 0, Qt::AlignVCenter | Qt::AlignRight);
	return w;
}

void addRow(QFrame *c, QWidget *r, bool first = false)
{
	auto *v = static_cast<QVBoxLayout *>(c->layout());
	if (!first) v->addWidget(sep());
	v->addWidget(r);
}

QPushButton *button(const QString &text, const char *name = nullptr)
{
	auto *b = new QPushButton(text);
	if (name) b->setObjectName(name);
	b->setCursor(Qt::PointingHandCursor);
	return b;
}

class Studio : public QDialog {
public:
	Studio(QWidget *parent, int port, const QByteArray &token) : QDialog(parent), port_(port), token_(token)
	{
		setWindowTitle("SYXTEE Studio");
		loadAssets();
		QFont base;
		base.setFamilies({"Inter", "SF Pro Text", ".AppleSystemUIFont", "Segoe UI", "sans-serif"});
		setFont(base);
		setStyleSheet(kStyle);
		setMinimumSize(620, 700);
		resize(660, 800);
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
	void resizeEvent(QResizeEvent *e) override
	{
		QDialog::resizeEvent(e);
		placeToast();
	}

private:
	struct Check {
		Dot *dot = nullptr;
		QLabel *title = nullptr, *sub = nullptr, *chip = nullptr;
		QPushButton *btn = nullptr;
	};

	int port_;
	QByteArray token_;
	QNetworkAccessManager nam_;
	QTimer *timer_ = nullptr, *toastTimer_ = nullptr;
	qint64 lastData_ = 0;
	bool paired_ = false, built_ = false, obsOn_ = false;
	QString jobDone_;
	QJsonObject state_, cloud_, optionsCache_;
	QJsonArray cols_;
	// dernier diagnostic de /api/live et flux choisi
	bool liveKnown_ = false, liveHasSource_ = false;
	QString destName_;

	QLabel *badge_ = nullptr, *version_ = nullptr, *toast_ = nullptr;
	Dot *badgeDot_ = nullptr;
	QStackedWidget *root_ = nullptr, *tabs_ = nullptr;
	QPushButton *tabBtn_[4] = {};
	// connexion
	QLabel *loginText_ = nullptr, *loginCode_ = nullptr, *loginErr_ = nullptr, *loginWait_ = nullptr;
	QWidget *loginCodeBox_ = nullptr, *loginSteps_ = nullptr;
	Dot *loginDot_ = nullptr;
	QPushButton *connect_ = nullptr, *reopen_ = nullptr;
	// direct
	Dot *heroDot_ = nullptr;
	QLabel *heroTitle_ = nullptr, *heroSub_ = nullptr, *heroCount_ = nullptr;
	Segments *heroBar_ = nullptr;
	Check chkAccount_, chkObs_, chkDest_, chkSource_, chkRegie_;
	QLabel *tilePreview_ = nullptr, *tilePreviewSub_ = nullptr, *tileRemote_ = nullptr, *tileRemoteSub_ = nullptr, *tileRegie_ = nullptr, *tileRegieSub_ = nullptr;
	// collections
	QVBoxLayout *localBox_ = nullptr, *cloudBox_ = nullptr;
	QLabel *quota_ = nullptr, *quotaOf_ = nullptr;
	QFrame *jobCard_ = nullptr;
	QLabel *job_ = nullptr;
	Dot *jobDot_ = nullptr;
	QProgressBar *bar_ = nullptr;
	// régie et diffusion
	QComboBox *secScene_ = nullptr, *secSource_ = nullptr, *liveScene_ = nullptr, *dest_ = nullptr;
	QWidget *destEmpty_ = nullptr, *liveAlert_ = nullptr;
	Switch *previewSw_ = nullptr;
	QLabel *previewHint_ = nullptr;
	QLabel *liveAlertText_ = nullptr, *fixOut_ = nullptr, *hostOut_ = nullptr;
	QPushButton *fixBtn_ = nullptr;
	Switch *auto_ = nullptr;
	QLabel *chip1_ = nullptr, *chip2_ = nullptr, *chip3_ = nullptr;
	Dot *regieDot_ = nullptr;
	QComboBox *droneScene_ = nullptr, *droneSource_ = nullptr;
	Switch *pilot_ = nullptr;
	QLabel *directorOut_ = nullptr;
	// poste
	QLineEdit *hostEdit_ = nullptr;
	QLabel *pingOut_ = nullptr, *accName_ = nullptr, *accMail_ = nullptr, *avatar_ = nullptr, *diagOut_ = nullptr;
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

	// Message bref en bas de la fenêtre (confirmations, erreurs d'action).
	void toast(const QString &text, const char *tone = "ok")
	{
		if (text.isEmpty()) return;
		toast_->setText(text);
		setTone(toast_, tone);
		toast_->ensurePolished();
		toast_->adjustSize();
		placeToast();
		toast_->show();
		toast_->raise();
		toastTimer_->start(3400);
	}
	void placeToast()
	{
		if (!toast_) return;
		toast_->move((width() - toast_->width()) / 2, height() - toast_->height() - 20);
	}

	// ───── Construction ─────
	void build()
	{
		auto *outer = new QVBoxLayout(this);
		outer->setContentsMargins(26, 20, 26, 16);
		outer->setSpacing(16);

		auto *head = new QHBoxLayout;
		head->setSpacing(10);
		// (S) STUDIO : le logo du site puis le nom, comme la barre du site.
		auto *logo = new QLabel;
		QPixmap lp;
		lp.loadFromData(k_logo, k_logo_len);
		const qreal dpr = devicePixelRatioF();
		lp = lp.scaledToHeight(int(24 * dpr), Qt::SmoothTransformation);
		lp.setDevicePixelRatio(dpr);
		logo->setPixmap(lp);
		logo->setFixedSize(int(lp.width() / dpr) + 1, int(lp.height() / dpr) + 1);
		auto *studio = label("STUDIO", "title");
		studio->setFont(sansFont(14, 600, 3.2));
		studio->setWordWrap(false);
		head->addWidget(logo);
		head->addSpacing(2);
		head->addWidget(studio);
		head->addStretch(1);
		auto *pill = new QFrame;
		pill->setObjectName("pill");
		auto *ph = new QHBoxLayout(pill);
		ph->setContentsMargins(8, 3, 12, 3);
		ph->setSpacing(4);
		badgeDot_ = new Dot;
		badge_ = new QLabel("Hors ligne");
		badge_->setStyleSheet("font-size: 12px; color: #d4d4d4;");
		ph->addWidget(badgeDot_);
		ph->addWidget(badge_);
		version_ = label("", "version");
		version_->setWordWrap(false);
		head->addWidget(pill);
		head->addWidget(version_);
		outer->addLayout(head);

		root_ = new QStackedWidget;
		outer->addWidget(root_, 1);
		root_->addWidget(buildLogin());
		root_->addWidget(buildMain());

		toast_ = new QLabel(this);
		toast_->setObjectName("toast");
		toast_->hide();
		toastTimer_ = new QTimer(this);
		toastTimer_->setSingleShot(true);
		QObject::connect(toastTimer_, &QTimer::timeout, toast_, &QWidget::hide);

		for (int i = 0; i < 4; i++) {
			auto *sc = new QShortcut(QKeySequence(QString("Ctrl+%1").arg(i + 1)), this);
			QObject::connect(sc, &QShortcut::activated, this, [this, i] { if (paired_) showTab(i); });
		}
		built_ = true;
	}

	QWidget *buildLogin()
	{
		auto *w = new QWidget;
		auto *v = new QVBoxLayout(w);
		v->setAlignment(Qt::AlignHCenter);
		v->setSpacing(14);

		auto *eyebrow = label("LIAISON OBS", "section");
		eyebrow->setAlignment(Qt::AlignCenter);
		auto *h = label("Connecte ton compte", "h1");
		h->setAlignment(Qt::AlignCenter);
		loginText_ = label("Relie cet OBS à ton compte SYXTEE pour le piloter depuis le site, même depuis ton téléphone, et sauvegarder tes scènes.", "muted");
		loginText_->setAlignment(Qt::AlignCenter);
		loginText_->setMaximumWidth(400);

		// Trois étapes, affichées tant que le code n'est pas là.
		loginSteps_ = new QWidget;
		loginSteps_->setMaximumWidth(400);
		auto *sv = new QVBoxLayout(loginSteps_);
		sv->setContentsMargins(0, 8, 0, 0);
		sv->setSpacing(10);
		const char *steps[3] = {"Clique sur Connecter", "Confirme dans la page qui s'ouvre", "Reviens ici : c'est relié"};
		for (int i = 0; i < 3; i++) {
			auto *r = new QHBoxLayout;
			r->setSpacing(12);
			auto *n = label(QString("0%1").arg(i + 1), "section");
			n->setWordWrap(false);
			n->setFixedWidth(22);
			r->addWidget(n);
			auto *t = label(steps[i], "muted");
			t->setStyleSheet("color: #d4d4d4;");
			r->addWidget(t, 1);
			sv->addLayout(r);
			if (i < 2) sv->addWidget(sep());
		}

		// Code d'appairage : dans un cadre, avec l'état d'attente.
		loginCodeBox_ = new QFrame;
		loginCodeBox_->setObjectName("card");
		loginCodeBox_->setMaximumWidth(400);
		auto *cv = new QVBoxLayout(loginCodeBox_);
		cv->setContentsMargins(18, 18, 18, 16);
		cv->setSpacing(10);
		loginCode_ = label("", "code");
		loginCode_->setAlignment(Qt::AlignCenter);
		auto *waitRow = new QHBoxLayout;
		waitRow->setSpacing(6);
		loginDot_ = new Dot;
		loginDot_->set(kWarn, false, true);
		loginWait_ = label("En attente de ta confirmation dans le navigateur", "muted");
		waitRow->addStretch(1);
		waitRow->addWidget(loginDot_);
		waitRow->addWidget(loginWait_);
		waitRow->addStretch(1);
		cv->addWidget(loginCode_);
		cv->addLayout(waitRow);
		loginCodeBox_->hide();

		loginErr_ = label("", "alert");
		loginErr_->setMaximumWidth(400);
		loginErr_->hide();
		connect_ = button("Connecter", "primary");
		reopen_ = button("Rouvrir la page dans le navigateur");
		reopen_->hide();
		QObject::connect(connect_, &QPushButton::clicked, this, [this] {
			connect_->setEnabled(false);
			post("/api/login/start", {}, [this](const QJsonObject &) { poll(); });
		});
		QObject::connect(reopen_, &QPushButton::clicked, this, [this] { post("/api/login/reopen"); });
		v->addStretch(2);
		v->addWidget(eyebrow);
		v->addWidget(h);
		v->addWidget(loginText_, 0, Qt::AlignHCenter);
		v->addWidget(loginSteps_, 0, Qt::AlignHCenter);
		v->addWidget(loginCodeBox_, 0, Qt::AlignHCenter);
		v->addWidget(loginErr_, 0, Qt::AlignHCenter);
		v->addSpacing(6);
		v->addWidget(connect_, 0, Qt::AlignHCenter);
		v->addWidget(reopen_, 0, Qt::AlignHCenter);
		v->addStretch(3);
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
		v->setSpacing(0);
		auto *bar = new QHBoxLayout;
		bar->setSpacing(0);
		const char *names[4] = {"DIRECT", "COLLECTIONS", "RÉGIE", "POSTE"};
		tabs_ = new QStackedWidget;
		for (int i = 0; i < 4; i++) {
			auto *b = button(names[i], "tab");
			b->setFont(monoFont(11, 1.8));
			b->setCheckable(true);
			b->setFocusPolicy(Qt::TabFocus);
			b->setToolTip(QString("Ctrl+%1").arg(i + 1));
			tabBtn_[i] = b;
			bar->addWidget(b);
			QObject::connect(b, &QPushButton::clicked, this, [this, i] { showTab(i); });
		}
		bar->addStretch(1);
		v->addLayout(bar);
		v->addWidget(sep());
		tabs_->addWidget(scroll(buildDirect()));
		tabs_->addWidget(scroll(buildCollections()));
		tabs_->addWidget(scroll(buildRegie()));
		tabs_->addWidget(scroll(buildPoste()));
		v->addWidget(tabs_, 1);
		showTab(0);
		return w;
	}

	void showTab(int i)
	{
		for (int k = 0; k < 4; k++) tabBtn_[k]->setChecked(k == i);
		tabs_->setCurrentIndex(i);
		lastData_ = 0;
		if (i > 0) refreshData();
	}

	QWidget *page(QVBoxLayout **out)
	{
		auto *w = new QWidget;
		auto *v = new QVBoxLayout(w);
		v->setContentsMargins(0, 16, 10, 12);
		v->setSpacing(10);
		*out = v;
		return w;
	}

	QWidget *sectionHead(const QString &title, const QString &hint = QString())
	{
		auto *w = new QWidget;
		auto *v = new QVBoxLayout(w);
		v->setContentsMargins(2, 10, 0, 0);
		v->setSpacing(4);
		v->addWidget(label(title, "section"));
		if (!hint.isEmpty()) v->addWidget(label(hint, "muted"));
		return w;
	}

	// Ligne de la liste « Avant de diffuser » : pastille d'état, titre, détail, puis un bouton d'action (s'il y a quelque chose à faire).
	QWidget *makeCheck(Check &c, const QString &title, const QString &btnText = QString())
	{
		auto *w = new QWidget;
		auto *h = new QHBoxLayout(w);
		h->setContentsMargins(0, 11, 0, 11);
		h->setSpacing(12);
		c.dot = new Dot;
		c.dot->set(kFaint, true);
		h->addWidget(c.dot, 0, Qt::AlignTop);
		auto *left = new QVBoxLayout;
		left->setSpacing(2);
		c.title = label(title, "name");
		c.sub = label("—", "muted");
		left->addWidget(c.title);
		left->addWidget(c.sub);
		h->addLayout(left, 1);
		c.chip = label("", "chip");
		c.chip->setWordWrap(false);
		c.chip->hide();
		h->addWidget(c.chip, 0, Qt::AlignVCenter);
		if (!btnText.isEmpty()) {
			c.btn = button(btnText, "small");
			c.btn->hide();
			h->addWidget(c.btn, 0, Qt::AlignVCenter);
		}
		return w;
	}

	// state : 0 à faire (creux), 1 en ordre, 2 erreur, 3 à regarder.
	void setCheck(Check &c, int state, const QString &sub, bool action = false, const QString &chip = QString())
	{
		const QColor col = state == 1 ? kOk : state == 2 ? kBad : state == 3 ? kWarn : kFaint;
		c.dot->set(col, state == 0);
		c.sub->setText(sub);
		if (c.btn) c.btn->setVisible(action);
		c.chip->setVisible(!chip.isEmpty());
		c.chip->setText(chip);
		setTone(c.chip, state == 1 ? "ok" : state == 2 ? "bad" : state == 3 ? "warn" : "");
	}

	QWidget *tile(const QString &title, QLabel **value, QLabel **sub)
	{
		auto *f = new QFrame;
		f->setObjectName("tile");
		auto *v = new QVBoxLayout(f);
		v->setContentsMargins(16, 14, 16, 14);
		v->setSpacing(4);
		auto *t = label(title, "section");
		t->setWordWrap(false);
		*value = label("—", "value");
		*sub = label("", "meta");
		v->addWidget(t);
		v->addSpacing(2);
		v->addWidget(*value);
		v->addWidget(*sub);
		v->addStretch(1);
		return f;
	}

	QWidget *buildDirect()
	{
		QVBoxLayout *v;
		auto *w = page(&v);

		// Bandeau d'état : la réponse à « puis-je lancer mon direct ? ».
		auto *hero = new QFrame;
		hero->setObjectName("hero");
		auto *hv = new QVBoxLayout(hero);
		hv->setContentsMargins(20, 18, 20, 18);
		hv->setSpacing(14);
		auto *top = new QHBoxLayout;
		top->setSpacing(12);
		heroDot_ = new Dot(30);
		heroDot_->set(kFaint, true);
		auto *tx = new QVBoxLayout;
		tx->setSpacing(3);
		heroTitle_ = label("Chargement…", "big");
		heroSub_ = label("", "muted");
		tx->addWidget(heroTitle_);
		tx->addWidget(heroSub_);
		heroCount_ = label("", "big");
		heroCount_->setFont(monoFont(22, 0, false));
		heroCount_->setWordWrap(false);
		top->addWidget(heroDot_, 0, Qt::AlignTop);
		top->addLayout(tx, 1);
		top->addWidget(heroCount_, 0, Qt::AlignTop);
		hv->addLayout(top);
		heroBar_ = new Segments(4);
		hv->addWidget(heroBar_);
		v->addWidget(hero);

		v->addWidget(sectionHead("AVANT DE DIFFUSER"));
		auto *c = card();
		addRow(c, makeCheck(chkAccount_, "Compte SYXTEE"), true);
		addRow(c, makeCheck(chkObs_, "OBS"));
		addRow(c, makeCheck(chkDest_, "Flux de destination", "Choisir"));
		addRow(c, makeCheck(chkSource_, "Source du flux dans ta scène de direct", "Corriger"));
		addRow(c, makeCheck(chkRegie_, "Régie automatique"));
		chkRegie_.title->setText("Régie automatique");
		v->addWidget(c);
		v->addWidget(label("Les quatre premières lignes sont nécessaires. La régie est facultative : elle change de scène à ta place.", "hint"));

		// Trois repères d'un coup d'œil.
		auto *tiles = new QHBoxLayout;
		tiles->setSpacing(10);
		tiles->addWidget(tile("APERÇU", &tilePreview_, &tilePreviewSub_), 1);
		tiles->addWidget(tile("TÉLÉCOMMANDE", &tileRemote_, &tileRemoteSub_), 1);
		tiles->addWidget(tile("RÉGIE", &tileRegie_, &tileRegieSub_), 1);
		v->addSpacing(4);
		v->addLayout(tiles);

		v->addWidget(sectionHead("DIFFUSION"));
		auto *d = card();
		dest_ = new Combo;
		auto *create = button("Créer un relais", "small");
		QObject::connect(create, &QPushButton::clicked, this, [] { QDesktopServices::openUrl(QUrl(QString("%1/dashboard/relais").arg(kSite))); });
		auto *destBox = new QWidget;
		auto *dh = new QHBoxLayout(destBox);
		dh->setContentsMargins(0, 0, 0, 0);
		dh->addWidget(dest_);
		destEmpty_ = create;
		dh->addWidget(create);
		previewSw_ = new Switch;
		previewHint_ = label("", "hint");
		addRow(d, row("Flux de destination", "Le flux que lit la source « Flux › NOM » de ta scène de direct", destBox), true);
		addRow(d, row("Aperçu programme", "Montre l'image et le son de ton direct sur le site, seulement quand la page est ouverte. Coupe-le si ton ordinateur est chargé.", previewSw_));
		auto *hintBox = new QWidget;
		auto *hb = new QVBoxLayout(hintBox);
		hb->setContentsMargins(0, 0, 0, 12);
		hb->addWidget(previewHint_);
		static_cast<QVBoxLayout *>(d->layout())->addWidget(hintBox);
		QObject::connect(previewSw_, &QAbstractButton::toggled, this, [this](bool on) {
			if (loadingSettings_) return;
			QJsonObject b;
			b["enabled"] = on;
			post("/api/preview", b);
		});
		v->addWidget(d);
		QObject::connect(dest_, &QComboBox::activated, this, [this](int i) {
			QJsonObject b;
			b["id"] = dest_->itemData(i).toString();
			post("/api/destination", b, [this](const QJsonObject &) { lastData_ = 0; poll(); refreshData(); });
		});

		// Actions des lignes de la liste.
		QObject::connect(chkDest_.btn, &QPushButton::clicked, this, [this] {
			if (dest_->isVisible()) {
				dest_->setFocus();
				dest_->showPopup();
			} else {
				QDesktopServices::openUrl(QUrl(QString("%1/dashboard/relais").arg(kSite)));
			}
		});
		QObject::connect(chkSource_.btn, &QPushButton::clicked, this, [this] {
			if (state_.value("liveScene").toString().isEmpty()) {
				showTab(2);
				liveScene_->setFocus();
				liveScene_->showPopup();
			} else {
				doFix();
			}
		});
		v->addStretch(1);
		return w;
	}

	QWidget *buildCollections()
	{
		QVBoxLayout *v;
		auto *w = page(&v);

		// Travail en cours (sauvegarde ou import) : visible seulement quand il y en a un.
		jobCard_ = new QFrame;
		jobCard_->setObjectName("card");
		auto *jh = new QHBoxLayout(jobCard_);
		jh->setContentsMargins(16, 12, 16, 12);
		jh->setSpacing(10);
		jobDot_ = new Dot;
		jobDot_->set(kWarn, false, true);
		job_ = label("", "muted");
		jh->addWidget(jobDot_);
		jh->addWidget(job_, 1);
		jobCard_->hide();
		v->addWidget(jobCard_);

		v->addWidget(sectionHead("SUR CE POSTE", "Les scènes, sources, filtres et médias partent ensemble. Les scripts Lua et Python sont exclus."));
		auto *c = card();
		localBox_ = new QVBoxLayout;
		localBox_->setSpacing(0);
		static_cast<QVBoxLayout *>(c->layout())->addLayout(localBox_);
		v->addWidget(c);

		v->addWidget(sectionHead("SUR SYXTEE", "Importer ajoute la collection à cet OBS, avec ses médias, sans toucher à la collection ouverte."));
		auto *q = new QFrame;
		q->setObjectName("card");
		auto *qv = new QVBoxLayout(q);
		qv->setContentsMargins(18, 16, 18, 16);
		qv->setSpacing(10);
		auto *qt = new QHBoxLayout;
		qt->setSpacing(8);
		quota_ = label("—", "big");
		quota_->setWordWrap(false);
		quotaOf_ = label("", "meta");
		quotaOf_->setWordWrap(false);
		qt->addWidget(quota_, 0, Qt::AlignBottom);
		qt->addWidget(quotaOf_, 0, Qt::AlignBottom);
		qt->addStretch(1);
		bar_ = new QProgressBar;
		bar_->setRange(0, 1000);
		bar_->setTextVisible(false);
		qv->addLayout(qt);
		qv->addWidget(bar_);
		v->addWidget(q);
		auto *cc = card();
		cloudBox_ = new QVBoxLayout;
		cloudBox_->setSpacing(0);
		static_cast<QVBoxLayout *>(cc->layout())->addLayout(cloudBox_);
		v->addWidget(cc);
		v->addStretch(1);
		return w;
	}

	// En-tête d'une étape de la régie : numéro mono, titre, état.
	QWidget *stepHead(const QString &idx, const QString &title, QLabel **chip)
	{
		auto *w = new QWidget;
		auto *h = new QHBoxLayout(w);
		h->setContentsMargins(0, 14, 0, 4);
		h->setSpacing(12);
		auto *n = label(idx, "section");
		n->setWordWrap(false);
		auto *t = label(title, "name");
		t->setStyleSheet("font-size: 14px; font-weight: 600;");
		*chip = label("", "chip");
		(*chip)->setWordWrap(false);
		h->addWidget(n);
		h->addWidget(t, 1);
		h->addWidget(*chip);
		return w;
	}

	QWidget *buildRegie()
	{
		QVBoxLayout *v;
		auto *w = page(&v);

		secScene_ = new Combo;
		secSource_ = new Combo;
		liveScene_ = new Combo;
		auto_ = new Switch;
		droneScene_ = new Combo;
		droneSource_ = new Combo;
		pilot_ = new Switch;

		// Résumé : ce que fait la régie en ce moment.
		auto *sum = new QFrame;
		sum->setObjectName("hero");
		auto *sh = new QHBoxLayout(sum);
		sh->setContentsMargins(18, 16, 18, 16);
		sh->setSpacing(12);
		regieDot_ = new Dot;
		regieDot_->set(kFaint, true);
		auto *st = new QVBoxLayout;
		st->setSpacing(3);
		st->addWidget(label("Régie automatique", "name"));
		directorOut_ = label("", "muted");
		st->addWidget(directorOut_);
		sh->addWidget(regieDot_, 0, Qt::AlignTop);
		sh->addLayout(st, 1);
		v->addWidget(sum);
		v->addWidget(label("SYXTEE surveille ton direct et change de scène pour toi. Tout part de ta scène de direct : rien ne bouge tant que tu n'as pas cliqué dessus dans OBS.", "hint"));

		// 1 · Scène de direct
		auto *s = card();
		addRow(s, stepHead("01", "Ta scène de direct", &chip1_), true);
		addRow(s, row("Scène de direct", "La scène que tu mets à l'antenne pour streamer. La régie ne démarre que lorsque tu cliques dessus.", liveScene_));
		liveAlert_ = new QWidget;
		auto *la = new QVBoxLayout(liveAlert_);
		la->setContentsMargins(0, 2, 0, 12);
		auto *box = new QFrame;
		box->setObjectName("notice");
		auto *bh = new QHBoxLayout(box);
		bh->setContentsMargins(14, 10, 12, 10);
		bh->setSpacing(12);
		liveAlertText_ = label("");
		fixBtn_ = button("Corriger", "primary");
		fixBtn_->setStyleSheet("padding: 7px 18px; font-size: 12px;");
		bh->addWidget(liveAlertText_, 1);
		bh->addWidget(fixBtn_, 0, Qt::AlignVCenter);
		la->addWidget(box);
		liveAlert_->hide();
		static_cast<QVBoxLayout *>(s->layout())->addWidget(liveAlert_);
		fixOut_ = label("", "ok");
		fixOut_->hide();
		static_cast<QVBoxLayout *>(s->layout())->addWidget(fixOut_);
		v->addWidget(s);

		// 2 · Si la connexion coupe
		auto *sc = card();
		addRow(sc, stepHead("02", "Si ta connexion coupe", &chip2_), true);
		addRow(sc, row("Passer sur la scène de secours", "Quand l'image de ton flux se fige ou coupe, SYXTEE affiche la scène de secours, puis revient sur ta scène de direct dès que l'image repart.", auto_));
		addRow(sc, row("Ce que SYXTEE surveille", "La source de ton flux (« Flux › NOM »). Elle est choisie toute seule quand tu cliques sur Corriger.", secSource_));
		addRow(sc, row("Scène de secours", "Par exemple « Connexion perdue ».", secScene_));
		v->addWidget(sc);

		// 3 · Auto-gérance
		auto *dc = card();
		addRow(dc, stepHead("03", "Auto-gérance (drone)", &chip3_), true);
		addRow(dc, row("Activer l'auto-gérance", "Quand ta caméra drone envoie une belle image (qui bouge, pas noire), SYXTEE passe dessus tout seul, puis revient sur ta scène de direct quand la prise s'arrête. Si tu changes de scène à la main, elle se met en pause 30 secondes.", pilot_));
		addRow(dc, row("Source du drone", "L'entrée OBS qui reçoit l'image du drone.", droneSource_));
		addRow(dc, row("Scène du drone", "N'importe quelle scène : pas besoin qu'elle s'appelle « Drone ».", droneScene_));
		v->addWidget(dc);
		v->addStretch(1);

		QObject::connect(liveScene_, &QComboBox::activated, this, [this] {
			QJsonObject b;
			b["scene"] = liveScene_->currentData().toString();
			post("/api/live-scene", b, [this](const QJsonObject &) { poll(); refreshLive(); });
		});
		QObject::connect(fixBtn_, &QPushButton::clicked, this, [this] { doFix(); });
		auto saveSwitch = [this] {
			if (loadingSettings_) return;
			QJsonObject b;
			b["enabled"] = auto_->isChecked();
			b["source"] = secSource_->currentData().toString();
			b["scene"] = secScene_->currentData().toString();
			post("/api/switch", b, [this](const QJsonObject &) { poll(); });
		};
		QObject::connect(auto_, &QAbstractButton::toggled, this, saveSwitch);
		QObject::connect(secScene_, &QComboBox::activated, this, saveSwitch);
		QObject::connect(secSource_, &QComboBox::activated, this, saveSwitch);
		auto saveDirector = [this] {
			if (loadingSettings_) return;
			QJsonObject b;
			b["enabled"] = pilot_->isChecked();
			b["droneScene"] = droneScene_->currentData().toString();
			b["droneSource"] = droneSource_->currentData().toString();
			post("/api/director", b, [this](const QJsonObject &) { poll(); });
		};
		QObject::connect(pilot_, &QAbstractButton::toggled, this, saveDirector);
		QObject::connect(droneScene_, &QComboBox::activated, this, saveDirector);
		QObject::connect(droneSource_, &QComboBox::activated, this, saveDirector);
		return w;
	}

	void doFix()
	{
		fixBtn_->setEnabled(false);
		chkSource_.btn->setEnabled(false);
		post("/api/fix", {}, [this](const QJsonObject &o) {
			fixBtn_->setEnabled(true);
			chkSource_.btn->setEnabled(true);
			const bool err = o.value("_error").toBool();
			const QString msg = o.value("message").toString(err ? "Agent injoignable." : "");
			fixOut_->setText(msg);
			fixOut_->setVisible(!msg.isEmpty());
			toast(msg, err || !o.value("ok").toBool(true) ? "bad" : "ok");
			lastData_ = 0;
			refreshData();
		});
	}

	QWidget *buildPoste()
	{
		QVBoxLayout *v;
		auto *w = page(&v);

		// CETTE MACHINE
		v->addWidget(sectionHead("CETTE MACHINE"));
		auto *m = card();
		hostEdit_ = new QLineEdit;
		hostEdit_->setMaxLength(40);
		hostOut_ = label("", "ok");
		hostOut_->setWordWrap(false);
		auto *save = button("Enregistrer", "small");
		auto doRename = [this, save] {
			const QString n = hostEdit_->text().trimmed();
			if (n.isEmpty()) return;
			save->setEnabled(false);
			QJsonObject b;
			b["name"] = n;
			post("/api/rename", b, [this, save](const QJsonObject &o) {
				save->setEnabled(true);
				const bool ok = o.value("ok").toBool();
				toast(ok ? "Nom enregistré" : o.value("error").toString("Échec de l'enregistrement"), ok ? "ok" : "bad");
				if (ok) {
					hostSaved_ = o.value("name").toString();
					hostEdit_->setText(hostSaved_);
				}
			});
		};
		QObject::connect(save, &QPushButton::clicked, this, doRename);
		QObject::connect(hostEdit_, &QLineEdit::returnPressed, this, doRename);
		auto *hw = new QWidget;
		auto *hh = new QHBoxLayout(hw);
		hh->setContentsMargins(0, 0, 0, 0);
		hh->setSpacing(8);
		hh->addWidget(hostEdit_);
		hh->addWidget(save);
		pingOut_ = label("", "meta");
		pingOut_->setWordWrap(false);
		auto *ping = button("Tester", "small");
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
		ph->setSpacing(10);
		ph->addWidget(pingOut_);
		ph->addWidget(ping);
		addRow(m, row("Nom du poste", "Affiché sur le site, dans Mes OBS et Contrôle à distance", hw), true);
		addRow(m, row("Test de connexion", "Latence vers les serveurs SYXTEE", pw));
		v->addWidget(m);

		// COMPTE
		v->addWidget(sectionHead("COMPTE"));
		auto *a = card();
		avatar_ = new QLabel;
		avatar_->setFixedSize(44, 44);
		accName_ = label("Compte SYXTEE", "name");
		accMail_ = label("", "muted");
		auto *out = button("Déconnecter", "danger");
		QObject::connect(out, &QPushButton::clicked, this, [this] { post("/api/unpair", {}, [this](const QJsonObject &) { poll(); }); });
		auto *aw = new QWidget;
		auto *ah = new QHBoxLayout(aw);
		ah->setContentsMargins(0, 14, 0, 14);
		ah->setSpacing(14);
		ah->addWidget(avatar_);
		auto *at = new QVBoxLayout;
		at->setSpacing(2);
		at->addWidget(accName_);
		at->addWidget(accMail_);
		ah->addLayout(at, 1);
		ah->addWidget(out, 0, Qt::AlignVCenter);
		static_cast<QVBoxLayout *>(a->layout())->addWidget(aw);
		v->addWidget(a);

		// LIENS ET DIAGNOSTIC
		v->addWidget(sectionHead("RACCOURCIS"));
		auto *l = card();
		auto linkRow = [this](const QString &title, const QString &sub, const QString &url) {
			auto *b = button("Ouvrir ↗", "small");
			QObject::connect(b, &QPushButton::clicked, this, [url] { QDesktopServices::openUrl(QUrl(url)); });
			return row(title, sub, b);
		};
		addRow(l, linkRow("Tableau de bord", "Relais, abonnement, contrôle à distance", QString("%1/dashboard").arg(kSite)), true);
		addRow(l, linkRow("Page de réglages", "La même fenêtre, dans ton navigateur", QString("http://127.0.0.1:%1/").arg(47831)));
		diagOut_ = label("", "meta");
		static_cast<QVBoxLayout *>(l->layout())->addWidget(diagOut_);
		diagOut_->setContentsMargins(0, 0, 0, 12);
		v->addWidget(l);
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
			liveKnown_ = true;
			liveHasSource_ = has;
			liveAlert_->setVisible(chosen && obsOn && !has);
			if (chosen && obsOn && !has) {
				const bool dest = o.value("destination").toBool();
				liveAlertText_->setText(dest ? "Aucune source de ton flux (« Flux › NOM ») dans la scène de direct. Sans elle, SYXTEE ne peut pas détecter une coupure."
							     : "Aucune source de ton flux (« Flux › NOM ») dans la scène de direct. Choisis d'abord un flux de destination, puis clique sur Corriger.");
			}
			if (has) fixOut_->hide();
			updateOverview();
		});
	}

	void fillStreams(const QJsonObject &o)
	{
		loadingSettings_ = true;
		dest_->clear();
		const QJsonArray arr = o.value("streams").toArray();
		const QString sel = o.value("selected").toString();
		destName_.clear();
		if (!sel.isEmpty() || !arr.isEmpty()) dest_->addItem("Choisir un flux…", "");
		for (const auto &sv : arr) {
			const QJsonObject st = sv.toObject();
			if (st.value("id").toString() == sel) destName_ = st.value("name").toString() + " · " + st.value("protocol").toString().toUpper();
			dest_->addItem(st.value("name").toString() + " · " + st.value("protocol").toString().toUpper() + (st.value("live").toBool() ? " · en direct" : ""), st.value("id").toString());
		}
		const int idx = dest_->findData(sel);
		dest_->setCurrentIndex(idx >= 0 ? idx : 0);
		const bool empty = arr.isEmpty();
		dest_->setVisible(!empty);
		destEmpty_->setVisible(empty);
		loadingSettings_ = false;
		updateOverview();
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
		accountMail_ = o.value("email").toString();
		updateOverview();
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
	QString accountMail_;

	// Avatar rond : image du compte, sinon l'initiale sur fond neutre.
	void setAvatar(const QPixmap &src, const QString &name)
	{
		const int n = 44;
		const qreal dpr = devicePixelRatioF();
		QPixmap out(int(n * dpr), int(n * dpr));
		out.setDevicePixelRatio(dpr);
		out.fill(Qt::transparent);
		QPainter p(&out);
		p.setRenderHint(QPainter::Antialiasing);
		p.setRenderHint(QPainter::SmoothPixmapTransform);
		QPainterPath clip;
		clip.addEllipse(0, 0, n, n);
		p.setClipPath(clip);
		if (!src.isNull()) {
			p.drawPixmap(0, 0, src.scaled(int(n * dpr), int(n * dpr), Qt::KeepAspectRatioByExpanding, Qt::SmoothTransformation));
		} else {
			p.fillRect(0, 0, n, n, QColor("#101010"));
			p.setPen(QColor("#ffffff"));
			QFont f = p.font();
			f.setPixelSize(18);
			f.setBold(true);
			p.setFont(f);
			p.drawText(QRect(0, 0, n, n), Qt::AlignCenter, name.left(1).toUpper());
		}
		p.setClipping(false);
		p.setPen(QPen(QColor(255, 255, 255, 36), 1));
		p.setBrush(Qt::NoBrush);
		p.drawEllipse(QRectF(0.5, 0.5, n - 1, n - 1));
		avatar_->setPixmap(out);
	}

	void applyState(const QJsonObject &s)
	{
		if (s.value("_error").toBool()) {
			badge_->setText("Agent injoignable");
			badgeDot_->set(kBad);
			root_->setCurrentIndex(0);
			loginText_->setText("L'agent SYXTEE Link ne répond pas. Ferme OBS et rouvre-le. S'il persiste, consulte ~/.syxtee-link/helper.log.");
			loginSteps_->hide();
			connect_->setEnabled(false);
			return;
		}
		state_ = s;
		const bool paired = s.value("paired").toBool();
		const QJsonObject st = s.value("status").toObject();
		const bool coreOn = st.value("core").toString() == "on";
		version_->setText("v" + s.value("version").toString());
		badge_->setText(coreOn && paired ? "Connecté" : paired ? "Connexion…" : "Non connecté");
		badgeDot_->set(coreOn && paired ? kOk : paired ? kWarn : kFaint, !paired, paired && !coreOn);
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
			loginSteps_->hide();
			loginCodeBox_->show();
			connect_->hide();
			reopen_->show();
			loginErr_->hide();
		} else {
			loginCode_->setText("");
			loginCodeBox_->hide();
			loginSteps_->show();
			loginText_->setText("Relie cet OBS à ton compte SYXTEE pour le piloter depuis le site, même depuis ton téléphone, et sauvegarder tes scènes.");
			connect_->show();
			connect_->setEnabled(true);
			reopen_->hide();
			if (ls == "error") {
				loginErr_->setText(lg.value("message").toString());
				loginErr_->show();
			} else loginErr_->hide();
		}

		// Aperçu programme : même interrupteur que sur le site (ce qu'on change d'un côté se voit de l'autre).
		{
			loadingSettings_ = true;
			previewSw_->setChecked(s.value("previewEnabled").toBool(true));
			loadingSettings_ = false;
			const QString pm = s.value("previewMode").toString();
			const QString why = s.value("previewReason").toString();
			previewHint_->setText(!s.value("previewEnabled").toBool(true) ? "Aperçu coupé : rien n'est envoyé."
					      : pm == "video" ? "En cours : image et son envoyés au site (vidéo réduite, encodeur matériel)."
					      : pm == "jpeg" ? "Aperçu en images sans son" + (why.isEmpty() ? QString() : " : " + why)
							     : "Prêt : l'envoi démarre quand la page Contrôle à distance est ouverte.");
		}
		// OBS vient de devenir joignable : on recharge scènes, sources et diagnostic de la scène de direct.
		const bool obsNow = st.value("obs").toString() == "on";
		if (obsNow && !obsOn_) lastData_ = 0;
		obsOn_ = obsNow;

		const QJsonObject job = st.value("job").toObject();
		if (!job.isEmpty() && job.value("state").toString() != "idle") {
			job_->setText(job.value("message").toString());
			const bool running = job.value("state").toString() == "running";
			jobDot_->set(running ? kWarn : job.value("state").toString() == "error" ? kBad : kOk, false, running);
			jobCard_->show();
			if (job.value("state").toString() == "done" && jobDone_ != job.value("message").toString()) {
				jobDone_ = job.value("message").toString();
				lastData_ = 0;
				refreshData();
			}
		} else jobCard_->hide();
		updateOverview();
		updateRegieSummary();
	}

	// Onglet Direct : liste des étapes, bandeau d'état et repères, recalculés à chaque nouvelle donnée.
	void updateOverview()
	{
		if (!heroTitle_ || state_.isEmpty()) return;
		const QJsonObject st = state_.value("status").toObject();
		const bool paired = state_.value("paired").toBool();
		const QString core = st.value("core").toString();
		const bool coreOn = core == "on", obsOn = st.value("obs").toString() == "on";
		const bool dest = !state_.value("destination").toString().isEmpty();
		const QString scene = state_.value("liveScene").toString();
		const QJsonObject bk = state_.value("backup").toObject(), au = state_.value("auto").toObject();
		const bool regieOn = bk.value("enabled").toBool() || au.value("enabled").toBool();
		const QString live = st.value("backup").toString();

		int done = 0;
		// Compte
		if (coreOn) {
			setCheck(chkAccount_, 1, accountMail_.isEmpty() ? "Ce poste est relié à ton compte." : accountMail_);
			done++;
		} else setCheck(chkAccount_, paired && core == "connecting" ? 3 : 2, paired && core == "connecting" ? "Connexion aux serveurs SYXTEE…" : "Les serveurs SYXTEE ne répondent pas. Vérifie ta connexion.");
		// OBS
		if (obsOn) {
			const QString ver = st.value("obsVersion").toString();
			setCheck(chkObs_, 1, ver.isEmpty() ? "OBS répond." : "OBS " + ver);
			done++;
		} else setCheck(chkObs_, 2, "OBS ne répond pas. Rouvre-le si besoin.");
		// Flux de destination
		if (dest) {
			setCheck(chkDest_, 1, destName_.isEmpty() ? "Flux choisi." : destName_);
			done++;
		} else setCheck(chkDest_, 0, "Aucun flux choisi : la source ne peut pas lire ton relais.", true);
		if (chkDest_.btn) chkDest_.btn->setText(dest_ && dest_->isVisible() ? "Choisir" : "Créer un relais");
		// Source dans la scène de direct
		if (scene.isEmpty()) {
			setCheck(chkSource_, 0, "Choisis d'abord ta scène de direct.", true);
			chkSource_.btn->setText("Choisir la scène");
		} else if (!dest) {
			setCheck(chkSource_, 0, "Choisis d'abord un flux de destination.");
		} else if (!obsOn || !liveKnown_) {
			setCheck(chkSource_, 0, "En attente d'OBS…");
		} else if (liveHasSource_) {
			setCheck(chkSource_, 1, "« Flux › NOM » est dans la scène « " + scene + " ».");
			done++;
		} else {
			setCheck(chkSource_, 2, "La scène « " + scene + " » n'a pas la source du flux.", true);
			chkSource_.btn->setText("Corriger");
		}
		// Régie (facultative)
		if (live == "backup") setCheck(chkRegie_, 3, "Connexion coupée : la scène de secours est à l'antenne.", false, "SECOURS");
		else if (live == "drone") setCheck(chkRegie_, 1, "Belle prise du drone à l'antenne.", false, "DRONE");
		else if (regieOn) setCheck(chkRegie_, 1, QString(bk.value("enabled").toBool() ? "Secours" : "") + (bk.value("enabled").toBool() && au.value("enabled").toBool() ? " et " : "") + (au.value("enabled").toBool() ? "auto-gérance" : "") + " actif.", false, "ACTIVE");
		else setCheck(chkRegie_, 0, "Éteinte. Tu peux l'activer dans l'onglet Régie.", false, "FACULTATIVE");
		if (regieOn || live == "backup" || live == "drone") chkRegie_.sub->setText(chkRegie_.sub->text().replace(0, 1, chkRegie_.sub->text().left(1).toUpper()));

		// Bandeau
		QColor hc = kFaint;
		bool pulse = false, hollow = false;
		QString title, sub;
		if (!paired || !coreOn) {
			hc = paired && core == "connecting" ? kWarn : kBad;
			pulse = paired && core == "connecting";
			title = pulse ? "Connexion…" : "Hors ligne";
			sub = pulse ? "Liaison avec les serveurs SYXTEE en cours." : "SYXTEE ne joint pas ton compte. Vérifie ta connexion.";
		} else if (live == "backup") {
			hc = kWarn;
			title = "Secours à l'antenne";
			sub = "Ta connexion a coupé : la scène de secours est affichée. Retour automatique dès que l'image repart.";
		} else if (live == "drone") {
			hc = kOk;
			pulse = true;
			title = "Drone à l'antenne";
			sub = "Belle prise détectée : la régie est passée sur la scène du drone.";
		} else if (done == 4) {
			hc = kOk;
			title = "Prêt à diffuser";
			sub = "Mets ta scène « " + scene + " » à l'antenne dans OBS" + (regieOn ? " : la régie prend le relais." : ".");
		} else {
			hc = kWarn;
			hollow = true;
			title = "À finaliser";
			sub = QString("Encore %1 étape%2 avant de diffuser.").arg(4 - done).arg(4 - done > 1 ? "s" : "");
		}
		heroDot_->set(hc, hollow, pulse);
		heroTitle_->setText(title);
		heroSub_->setText(sub);
		heroCount_->setText(QString("%1/4").arg(done));
		heroBar_->set(done, done == 4 ? kOk : kWarn);

		// Repères
		const QString pm = state_.value("previewMode").toString();
		const bool pe = state_.value("previewEnabled").toBool(true);
		tilePreview_->setText(!pe ? "Coupé" : pm == "video" ? "Vidéo et son" : pm == "jpeg" ? "Images seules" : "En attente");
		tilePreviewSub_->setText(!pe ? "rien n'est envoyé" : pm == "idle" || pm.isEmpty() ? "page ouverte requise" : "envoyé au site");
		const int viewers = st.value("viewers").toInt();
		tileRemote_->setText(viewers > 0 ? QString::number(viewers) + (viewers > 1 ? " appareils" : " appareil") : "Aucun");
		tileRemoteSub_->setText(viewers > 0 ? "sur Contrôle à distance" : "page fermée");
		tileRegie_->setText(live == "backup" ? "Secours" : live == "drone" ? "Drone" : regieOn ? "Prête" : "Éteinte");
		tileRegieSub_->setText(live == "backup" || live == "drone" ? "à l'antenne" : regieOn ? "attend ta scène" : "facultative");

		if (diagOut_) {
			const QString obsv = st.value("obsVersion").toString();
			diagOut_->setText(QString("Link v%1  ·  OBS %2").arg(state_.value("version").toString(), obsv.isEmpty() ? "—" : obsv));
		}
	}

	void setChip(QLabel *chip, const QString &text, const char *tone)
	{
		chip->setText(text);
		setTone(chip, tone);
	}

	void updateRegieSummary()
	{
		if (!directorOut_ || state_.isEmpty()) return;
		const QJsonObject bk = state_.value("backup").toObject(), au = state_.value("auto").toObject();
		const QString ds = state_.value("status").toObject().value("backup").toString();
		const bool armed = !state_.value("liveScene").toString().isEmpty();
		const bool b = bk.value("enabled").toBool(), p = au.value("enabled").toBool();
		directorOut_->setText(!armed ? "Choisis d'abord ta scène de direct (étape 1)."
			: ds == "drone" ? "En ce moment : belle prise du drone à l'antenne."
			: ds == "backup" ? "En ce moment : scène de secours à l'antenne (connexion coupée)."
			: (b || p) ? "Régie prête : elle s'active dès que tu mets ta scène de direct à l'antenne."
			: "Régie éteinte : active le secours (2) ou l'auto-gérance (3).");
		regieDot_->set(ds == "backup" ? kWarn : ds == "drone" ? kOk : (b || p) && armed ? kOk : kFaint, !(ds == "backup" || ds == "drone" || ((b || p) && armed)), ds == "drone" || ds == "backup");
		setChip(chip1_, armed ? "OK" : "À CHOISIR", armed ? "ok" : "");
		setChip(chip2_, b ? "ACTIF" : "ÉTEINT", b ? "ok" : "");
		setChip(chip3_, p ? "ACTIF" : "ÉTEINT", p ? "ok" : "");
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
			auto *btn = button("Sauvegarder", "small");
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
			auto *auto_ = label("AUTO", "section");
			auto_->setWordWrap(false);
			ch->addWidget(auto_);
			ch->addWidget(sw);
			ch->addSpacing(4);
			ch->addWidget(btn);
			const QString sub = (last.isEmpty() ? QString("Jamais sauvegardée") : "Sauvegardée le " + last) + " · " + QString::number(c.value("media").toInt()) + " médias · " + fmtSize(c.value("bytes").toDouble());
			if (!first) localBox_->addWidget(sep());
			localBox_->addWidget(row(name, sub, ctl, true));
			first = false;
		}

		clear(cloudBox_);
		if (cloud_.contains("error")) {
			quota_->setText("—");
			quotaOf_->setText(cloud_.value("error").toString());
			bar_->setValue(0);
		} else {
			const double used = cloud_.value("used").toDouble(), quota = cloud_.value("quota").toDouble(5.0 * 1024 * 1024 * 1024);
			const double ratio = qMin(1.0, used / quota);
			quota_->setText(fmtSize(used));
			quotaOf_->setText("sur " + fmtSize(quota) + QString("  ·  %1 %").arg(qRound(ratio * 100)));
			bar_->setValue(int(ratio * 1000));
			bar_->setProperty("tone", ratio >= 0.95 ? "bad" : ratio >= 0.8 ? "warn" : "");
			bar_->style()->unpolish(bar_);
			bar_->style()->polish(bar_);
		}
		if (backups.isEmpty()) cloudBox_->addWidget(row("Aucune sauvegarde", "Sauvegarde une collection pour la retrouver ici.", nullptr));
		first = true;
		for (const auto &bv : backups) {
			const QJsonObject b = bv.toObject();
			const QString id = b.value("id").toString();
			auto *btn = button("Importer", "small");
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
			cloudBox_->addWidget(row(b.value("collection").toString().isEmpty() ? b.value("name").toString() : b.value("collection").toString(), sub, btn, true));
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
		const QJsonObject au = state_.value("auto").toObject();
		fill(droneScene_, o.value("scenes").toArray(), au.value("droneScene").toString());
		fill(droneSource_, o.value("inputs").toArray(), au.value("droneSource").toString());
		pilot_->setChecked(au.value("enabled").toBool());
		loadingSettings_ = false;
		updateRegieSummary();
		updateOverview();
	}
};

} // namespace

QWidget *syxtee_create_window(QWidget *parent, int port, const QByteArray &token)
{
	return new Studio(parent, port, token);
}
