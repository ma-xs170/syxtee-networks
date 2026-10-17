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

// Pictogrammes au trait (comme ceux de la liste de sources du site) : encre grise, jamais d'emoji en couleur.
enum IconKind { IcLive, IcSource, IcShield, IcCamera, IcDrone, IcFrame, IcEye, IcMonitor };
class Icon : public QWidget {
public:
	explicit Icon(IconKind k, QWidget *parent = nullptr) : QWidget(parent), kind_(k) { setFixedSize(18, 18); }
protected:
	void paintEvent(QPaintEvent *) override
	{
		QPainter p(this);
		p.setRenderHint(QPainter::Antialiasing);
		p.setPen(QPen(QColor("#a3a3a3"), 1.5, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));
		p.setBrush(Qt::NoBrush);
		p.translate(1, 1);
		switch (kind_) {
		case IcLive: // point et ondes
			p.drawEllipse(QPointF(8, 8), 1.6, 1.6);
			p.drawArc(QRectF(3.5, 3.5, 9, 9), 40 * 16, 100 * 16);
			p.drawArc(QRectF(3.5, 3.5, 9, 9), 220 * 16, 100 * 16);
			p.drawArc(QRectF(0.5, 0.5, 15, 15), 40 * 16, 100 * 16);
			p.drawArc(QRectF(0.5, 0.5, 15, 15), 220 * 16, 100 * 16);
			break;
		case IcSource: // flux : trois barres de signal
			p.drawLine(QPointF(2, 13), QPointF(2, 10));
			p.drawLine(QPointF(6, 13), QPointF(6, 7));
			p.drawLine(QPointF(10, 13), QPointF(10, 4));
			p.drawLine(QPointF(14, 13), QPointF(14, 1));
			break;
		case IcShield:
			p.drawPath([] { QPainterPath q; q.moveTo(8, 0.8); q.lineTo(14.5, 3); q.lineTo(14.5, 8); q.quadTo(14.5, 12.8, 8, 15.2); q.quadTo(1.5, 12.8, 1.5, 8); q.lineTo(1.5, 3); q.closeSubpath(); return q; }());
			break;
		case IcCamera:
			p.drawRoundedRect(QRectF(0.8, 3.5, 10, 9), 2, 2);
			p.drawPolyline(QPolygonF({QPointF(10.8, 7), QPointF(15, 4.5), QPointF(15, 11.5), QPointF(10.8, 9)}));
			break;
		case IcDrone: // quatre hélices autour d'un corps
			p.drawEllipse(QPointF(8, 8), 2, 2);
			p.drawLine(QPointF(9.5, 6.5), QPointF(12.5, 3.5));
			p.drawLine(QPointF(6.5, 6.5), QPointF(3.5, 3.5));
			p.drawLine(QPointF(9.5, 9.5), QPointF(12.5, 12.5));
			p.drawLine(QPointF(6.5, 9.5), QPointF(3.5, 12.5));
			for (const QPointF c : {QPointF(13.5, 2.5), QPointF(2.5, 2.5), QPointF(13.5, 13.5), QPointF(2.5, 13.5)}) p.drawEllipse(c, 2, 2);
			break;
		case IcEye:
			p.drawPath([] { QPainterPath q; q.moveTo(0.8, 8); q.quadTo(8, -1.5, 15.2, 8); q.quadTo(8, 17.5, 0.8, 8); return q; }());
			p.drawEllipse(QPointF(8, 8), 2.4, 2.4);
			break;
		case IcMonitor:
			p.drawRoundedRect(QRectF(0.8, 1.5, 14.4, 9.5), 2, 2);
			p.drawLine(QPointF(5, 14.5), QPointF(11, 14.5));
			p.drawLine(QPointF(8, 11), QPointF(8, 14.5));
			break;
		case IcFrame:
			p.drawRoundedRect(QRectF(0.8, 2, 14.4, 12), 2.5, 2.5);
			p.drawLine(QPointF(0.8, 6), QPointF(15.2, 6));
			break;
		}
	}
private:
	IconKind kind_;
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
QWidget *row(const QString &title, const QString &sub, QWidget *right, int icon = -1)
{
	auto *w = new QWidget;
	auto *h = new QHBoxLayout(w);
	h->setContentsMargins(0, 12, 0, 12);
	h->setSpacing(16);
	if (icon >= 0) h->addWidget(new Icon(IconKind(icon)), 0, Qt::AlignTop);
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
	int port_;
	QByteArray token_;
	QNetworkAccessManager nam_;
	QTimer *timer_ = nullptr, *toastTimer_ = nullptr;
	qint64 lastData_ = 0;
	bool paired_ = false, built_ = false, obsOn_ = false;
	QJsonObject state_, optionsCache_;
	// dernier diagnostic de /api/live et flux choisi
	bool liveKnown_ = false, liveHasSource_ = false;
	QString destName_;

	QLabel *badge_ = nullptr, *version_ = nullptr, *toast_ = nullptr;
	Dot *badgeDot_ = nullptr;
	QStackedWidget *root_ = nullptr, *tabs_ = nullptr;
	QPushButton *tabBtn_[3] = {};
	// connexion
	QLabel *loginText_ = nullptr, *loginCode_ = nullptr, *loginErr_ = nullptr, *loginWait_ = nullptr;
	QWidget *loginCodeBox_ = nullptr, *loginSteps_ = nullptr;
	Dot *loginDot_ = nullptr;
	QPushButton *connect_ = nullptr, *reopen_ = nullptr;
	// direct
	Dot *heroDot_ = nullptr;
	QLabel *heroTitle_ = nullptr, *heroSub_ = nullptr, *heroCount_ = nullptr;
	Segments *heroBar_ = nullptr;
	QPushButton *heroBtn_ = nullptr;
	int heroAct_ = 0;
	// régie et diffusion
	QComboBox *secScene_ = nullptr, *secSource_ = nullptr, *liveScene_ = nullptr, *dest_ = nullptr;
	QWidget *destEmpty_ = nullptr, *liveAlert_ = nullptr;
	Switch *previewSw_ = nullptr;
	QLabel *previewHint_ = nullptr;
	QLabel *liveAlertText_ = nullptr, *fixOut_ = nullptr, *hostOut_ = nullptr;
	QPushButton *fixBtn_ = nullptr;
	Switch *auto_ = nullptr;
	QLabel *chip2_ = nullptr, *chip3_ = nullptr;
	QWidget *protBody_ = nullptr, *droneBody_ = nullptr;
	QComboBox *droneScene_ = nullptr, *droneSource_ = nullptr;
	Switch *pilot_ = nullptr;
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

		for (int i = 0; i < 3; i++) {
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
		const char *names[3] = {"DIRECT", "RÉGIE", "POSTE"};
		tabs_ = new QStackedWidget;
		for (int i = 0; i < 3; i++) {
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
		tabs_->addWidget(scroll(buildRegie()));
		tabs_->addWidget(scroll(buildPoste()));
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

	QWidget *buildDirect()
	{
		QVBoxLayout *v;
		auto *w = page(&v);

		// Bandeau d'état : la réponse à « puis-je lancer mon direct ? ». S'il manque quelque chose, le bouton fait la prochaine étape.
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
		heroBtn_ = button("", "primary");
		heroBtn_->setStyleSheet("padding: 8px 20px; font-size: 12px;");
		heroBtn_->hide();
		hv->addWidget(heroBtn_, 0, Qt::AlignLeft);
		v->addWidget(hero);

		v->addWidget(sectionHead("DIFFUSION"));
		auto *d = card();
		dest_ = new Combo;
		dest_->setFixedWidth(285);
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
		addRow(d, row("Flux de destination", "Lu par la source « Flux › NOM » de ta scène de direct", destBox, IcSource), true);
		addRow(d, row("Aperçu programme", "Image et son sur le site, seulement quand la page est ouverte.", previewSw_, IcEye));
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

		QObject::connect(heroBtn_, &QPushButton::clicked, this, [this] {
			if (heroAct_ == 1) {
				if (dest_->isVisible()) {
					dest_->setFocus();
					dest_->showPopup();
				} else {
					QDesktopServices::openUrl(QUrl(QString("%1/dashboard/relais").arg(kSite)));
				}
			} else if (heroAct_ == 2) {
				showTab(1);
				liveScene_->setFocus();
				liveScene_->showPopup();
			} else if (heroAct_ == 3) {
				doFix();
			}
		});
		v->addStretch(1);
		return w;
	}

	// Carte à interrupteur : titre (avec emoji) et état à gauche, interrupteur à droite dans l'en-tête ; le contenu se déplie quand c'est actif.
	QFrame *switchCard(const QString &title, const QString &desc, Switch *sw, QLabel **chip, QWidget **body)
	{
		auto *f = new QFrame;
		f->setObjectName("card");
		auto *v = new QVBoxLayout(f);
		v->setContentsMargins(18, 0, 18, 0);
		v->setSpacing(0);
		auto *h = new QWidget;
		auto *hl = new QHBoxLayout(h);
		hl->setContentsMargins(0, 14, 0, 14);
		hl->setSpacing(10);
		auto *t = label(title, "name");
		t->setStyleSheet("font-size: 14px; font-weight: 600;");
		t->setWordWrap(false);
		*chip = label("", "chip");
		(*chip)->setWordWrap(false);
		(*chip)->hide();
		auto *tl = new QVBoxLayout;
		tl->setSpacing(3);
		auto *tr = new QHBoxLayout;
		tr->setSpacing(10);
		tr->addWidget(t);
		tr->addWidget(*chip);
		tr->addStretch(1);
		tl->addLayout(tr);
		tl->addWidget(label(desc, "muted"));
		hl->addLayout(tl, 1);
		hl->addSpacing(12);
		hl->addWidget(sw, 0, Qt::AlignTop);
		v->addWidget(h);
		*body = new QWidget;
		auto *bl = new QVBoxLayout(*body);
		bl->setContentsMargins(0, 0, 0, 0);
		bl->setSpacing(0);
		v->addWidget(*body);
		return f;
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

		// Protection des déconnexions : la scène de direct est le point de départ, le reste apparaît quand l'interrupteur est activé.
		QWidget *pbody, *dbody;
		auto *prot = switchCard("Protection des déconnexions", "Quand l'image de ton flux se fige ou coupe, SYXTEE affiche la scène de secours, puis revient sur ta scène de direct dès que l'image repart.", auto_, &chip2_, &pbody);
		auto *pl = static_cast<QVBoxLayout *>(pbody->layout());
		protBody_ = new QWidget;
		auto *pbl = new QVBoxLayout(protBody_);
		pbl->setContentsMargins(0, 0, 0, 0);
		pbl->setSpacing(0);
		pl->addWidget(sep());
		pl->addWidget(row("Scène de direct", "La scène que tu mets à l'antenne pour streamer. La protection ne démarre que lorsque tu cliques dessus.", liveScene_, IcLive));
		liveAlert_ = new QWidget;
		auto *la = new QVBoxLayout(liveAlert_);
		la->setContentsMargins(0, 0, 0, 12);
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
		pl->addWidget(liveAlert_);
		fixOut_ = label("", "ok");
		fixOut_->hide();
		pl->addWidget(fixOut_);
		pbl->addWidget(sep());
		pbl->addWidget(row("Source surveillée", "La source de ton flux (« Flux › NOM »). Elle est choisie toute seule quand tu cliques sur Corriger.", secSource_, IcSource));
		pbl->addWidget(sep());
		pbl->addWidget(row("Scène de secours", "Affichée pendant la coupure, par exemple « Connexion perdue ».", secScene_, IcShield));
		pl->addWidget(protBody_);
		v->addWidget(prot);

		// Auto-gérance (drone) : même principe.
		auto *drone = switchCard("Auto-gérance drone", "Quand ta caméra drone envoie une belle image (qui bouge, pas noire), SYXTEE passe dessus tout seul, puis revient sur ta scène de direct quand la prise s'arrête. Si tu changes de scène à la main, elle se met en pause 30 secondes.", pilot_, &chip3_, &dbody);
		auto *dl = static_cast<QVBoxLayout *>(dbody->layout());
		droneBody_ = new QWidget;
		auto *dbl = new QVBoxLayout(droneBody_);
		dbl->setContentsMargins(0, 0, 0, 0);
		dbl->setSpacing(0);
		dbl->addWidget(sep());
		dbl->addWidget(row("Source du drone", "L'entrée OBS qui reçoit l'image du drone.", droneSource_, IcCamera));
		dbl->addWidget(sep());
		dbl->addWidget(row("Scène du drone", "N'importe quelle scène : pas besoin qu'elle s'appelle « Drone ».", droneScene_, IcDrone));
		dl->addWidget(droneBody_);
		v->addWidget(drone);
		v->addStretch(1);
		protBody_->hide();
		droneBody_->hide();

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
		heroBtn_->setEnabled(false);
		post("/api/fix", {}, [this](const QJsonObject &o) {
			fixBtn_->setEnabled(true);
			heroBtn_->setEnabled(true);
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
		addRow(m, row("Nom du poste", "Affiché sur le site, dans Mes OBS et Contrôle à distance", hw, IcMonitor), true);
		addRow(m, row("Test de connexion", "Latence vers les serveurs SYXTEE", pw, IcSource));
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
			return row(title, sub, b, IcFrame);
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
			dest_->addItem(st.value("name").toString() + " · " + st.value("protocol").toString().toUpper() + (st.value("live").toBool() ? " · live" : ""), st.value("id").toString());
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

		updateOverview();
		updateRegieSummary();
	}

	// Onglet Direct : bandeau d'état, recalculé à chaque nouvelle donnée.
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
		const bool srcOk = !scene.isEmpty() && dest && obsOn && liveKnown_ && liveHasSource_;

		// Quatre étapes : compte, OBS, flux, source du flux dans la scène de direct. La première qui manque donne le message et le bouton.
		const int done = int(coreOn) + int(obsOn) + int(dest) + int(srcOk);
		QString need;
		QString btn;
		heroAct_ = 0;
		if (!coreOn) need = core == "connecting" ? "Liaison avec les serveurs SYXTEE en cours." : "SYXTEE ne joint pas ton compte. Vérifie ta connexion.";
		else if (!obsOn) need = "OBS ne répond pas. Rouvre-le si besoin.";
		else if (!dest) { need = "Choisis le flux de destination (relais) que ta scène doit lire."; btn = dest_ && dest_->isVisible() ? "Choisir un flux" : "Créer un relais"; heroAct_ = 1; }
		else if (scene.isEmpty()) { need = "Choisis ta scène de direct."; btn = "Choisir la scène"; heroAct_ = 2; }
		else if (!liveKnown_) need = "Vérification de la scène « " + scene + " »…";
		else if (!liveHasSource_) { need = "La scène « " + scene + " » n'a pas la source du flux."; btn = "Corriger"; heroAct_ = 3; }

		QColor hc = kFaint;
		bool pulse = false, hollow = false;
		QString title, sub;
		if (!paired || !coreOn) {
			hc = paired && core == "connecting" ? kWarn : kBad;
			pulse = paired && core == "connecting";
			title = pulse ? "Connexion…" : "Hors ligne";
			sub = need;
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
			sub = need;
		}
		heroDot_->set(hc, hollow, pulse);
		heroTitle_->setText(title);
		heroSub_->setText(sub);
		heroCount_->setText(QString("%1/4").arg(done));
		heroBar_->set(done, done == 4 ? kOk : kWarn);
		heroBtn_->setVisible(heroAct_ != 0 && done < 4);
		heroBtn_->setText(btn);
		heroBtn_->setEnabled(true);

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
		if (!protBody_ || state_.isEmpty()) return;
		const QJsonObject bk = state_.value("backup").toObject(), au = state_.value("auto").toObject();
		const QString ds = state_.value("status").toObject().value("backup").toString();
		const bool b = bk.value("enabled").toBool(), p = au.value("enabled").toBool();
		protBody_->setVisible(b);
		droneBody_->setVisible(p);
		chip2_->setVisible(ds == "backup");
		setChip(chip2_, "SECOURS À L'ANTENNE", "warn");
		chip3_->setVisible(ds == "drone");
		setChip(chip3_, "DRONE À L'ANTENNE", "ok");
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
