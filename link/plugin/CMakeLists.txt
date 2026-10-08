cmake_minimum_required(VERSION 3.28)

# Plugin OBS SYXTEE pour Windows (et Linux), sur le modèle d'obs-plugintemplate.
# ATTENTION : cette construction n'a PAS été essayée (pas de machine Windows) : bêta. Sur macOS, la construction est `npm run plugin` (link/).
#
# Contenu : syxtee-link.c (lance l'agent), qt/studio_ui.cpp + qt/studio_menu.cpp (menu SYXTEE et fenêtre Studio),
# qt/obsctl.cpp (pilotage d'OBS dans le plugin, aperçu WHIP, sources « Flux SYXTEE »).
#
#   cmake -S link/plugin -B build -DCMAKE_PREFIX_PATH="<obs-deps>;<obs-deps>/qt6" -Dlibobs_DIR=<obs-studio>/build/libobs
#   cmake --build build --config RelWithDebInfo

project(syxtee-link VERSION 0.5.3 LANGUAGES C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC OFF) # aucun Q_OBJECT : pas de moc

find_package(libobs REQUIRED)
find_package(obs-frontend-api REQUIRED)
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Network)

add_library(syxtee-link MODULE
  syxtee-link.c
  qt/studio_ui.cpp
  qt/studio_menu.cpp
  qt/obsctl.cpp)

target_include_directories(syxtee-link PRIVATE qt)
target_link_libraries(syxtee-link PRIVATE OBS::libobs OBS::obs-frontend-api Qt6::Core Qt6::Gui Qt6::Widgets Qt6::Network)
if(WIN32)
  target_compile_definitions(syxtee-link PRIVATE _CRT_RAND_S)
  set_target_properties(syxtee-link PROPERTIES PREFIX "")
endif()
