#pragma once
// Commandes du faux OBS (voir obs-stub.cpp).
#include <obs.h>
#include <obs-frontend-api.h>
#include <string>

obs_source_t *stub_scene(const char *name);
obs_source_t *stub_input(const char *name, const char *id, uint32_t flags);
int64_t stub_add_item(obs_source_t *scene, obs_source_t *src);
void stub_boot();
void stub_fe(obs_frontend_event e);
void stub_set_scene(const char *name);
void stub_mute(const char *name, bool muted);
void stub_vol(const char *name, double mul);
void stub_rename(const char *from, const char *to);
void stub_stream(bool on);
void stub_add_bytes(uint64_t bytes);
void stub_meter(const char *name, float magnitude);
bool stub_streaming();
bool stub_recording();
bool stub_paused();
std::string stub_scene_collection();
std::string stub_profile();
bool stub_item_visible(const char *scene, int64_t id);
int stub_item_count(const char *scene);
std::string stub_setting(const char *input, const char *key);
void stub_whip_available(bool on);
void stub_whip_fails(bool on);
void stub_whip_drop(const char *error);
std::string stub_whip_info();
