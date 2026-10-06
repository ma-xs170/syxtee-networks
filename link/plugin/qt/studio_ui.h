#pragma once
// Fenêtre « SYXTEE Studio » (Qt, widgets natifs). Sans dépendance à OBS : elle parle à l'agent local (HTTP sur 127.0.0.1) et peut donc
// être essayée hors d'OBS (voir test/ui-shot.cpp). Aucun Q_OBJECT : pas de moc, seulement des connexions par lambdas.
#include <QByteArray>
#include <QWidget>

QWidget *syxtee_create_window(QWidget *parent, int port, const QByteArray &token);
