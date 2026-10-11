import Foundation
import Observation

/// Contrôle à distance d'OBS : l'app envoie des ordres au Core, qui les transmet au plugin SYXTEE dans OBS sur le PC.
/// (Même protocole que la page « Contrôle » du site : WebSocket /v1/link/remote, requêtes OBS WebSocket 5.)
@Observable @MainActor final class RemoteClient {
    enum Link { case connecting, on, off, denied }
    struct Input: Identifiable, Equatable { let name: String; var muted: Bool; var db: Double; var id: String { name } }

    private(set) var link: Link = .connecting
    private(set) var agentOnline = false
    private(set) var agentName: String?
    private(set) var latency: Int?
    private(set) var scenes: [String] = []
    private(set) var currentScene = ""
    private(set) var streaming = false
    private(set) var recording = false
    private(set) var inputs: [Input] = []
    var error: String?

    private let session: Session
    private var task: URLSessionWebSocketTask?
    private var waiting: [String: CheckedContinuation<[String: Any], Error>] = [:]
    private var seq = 0
    private var running = false
    private var pinger: Task<Void, Never>?

    static let coreURL = URL(string: "wss://15-235-25-77.sslip.io/v1/link/remote")!

    init(session: Session) { self.session = session }

    func start() { guard !running else { return }; running = true; Task { await loop() } }
    func stop() { running = false; pinger?.cancel(); task?.cancel(with: .goingAway, reason: nil); task = nil; link = .off }

    // MARK: Connexion

    private func loop() async {
        while running {
            link = .connecting
            _ = await session.refresh()   // jeton frais pour la connexion
            guard let token = session.accessToken else { link = .off; try? await Task.sleep(for: .seconds(5)); continue }
            let t = URLSession.shared.webSocketTask(with: Self.coreURL)
            task = t
            t.resume()
            do {
                try await t.send(.string(json(["type": "hello", "access": token])))
                while running {
                    let m = try await t.receive()
                    if case .string(let s) = m, let d = s.data(using: .utf8), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { handle(o) }
                }
            } catch {
                if case .denied = link { return }
            }
            agentOnline = false; latency = nil
            for (_, c) in waiting { c.resume(throwing: RemoteError("Connexion perdue.")) }
            waiting.removeAll()
            if t.closeCode.rawValue == 4003 || t.closeCode.rawValue == 4005 { link = .denied; running = false; return }
            link = .off
            if running { try? await Task.sleep(for: .seconds(3)) }
        }
    }

    private func handle(_ m: [String: Any]) {
        switch m["type"] as? String {
        case "ready":
            link = .on
            apply(agent: m["agent"] as? [String: Any])
        case "agent": apply(agent: m)
        case "event": event(m["name"] as? String ?? "", m["data"] as? [String: Any] ?? [:])
        case "res":
            guard let id = m["id"] as? String, let c = waiting.removeValue(forKey: id) else { return }
            if (m["ok"] as? Bool) == true { c.resume(returning: m["result"] as? [String: Any] ?? [:]) }
            else { c.resume(throwing: RemoteError(Self.text(m["error"] as? String ?? "erreur"))) }
        default: break
        }
    }

    private func apply(agent: [String: Any]?) {
        let online = (agent?["online"] as? Bool) ?? false
        let was = agentOnline
        agentOnline = online
        agentName = agent?["name"] as? String
        if online, !was { Task { await refresh() }; startPing() }
        if !online { pinger?.cancel() }
    }

    private func event(_ name: String, _ d: [String: Any]) {
        switch name {
        case "StreamStateChanged": streaming = (d["outputActive"] as? Bool) ?? false
        case "RecordStateChanged": recording = (d["outputActive"] as? Bool) ?? false
        case "CurrentProgramSceneChanged": if let s = d["sceneName"] as? String { currentScene = s }
        case "SceneListChanged", "SceneCreated", "SceneRemoved", "SceneNameChanged": Task { await loadScenes() }
        case "InputMuteStateChanged":
            if let n = d["inputName"] as? String, let i = inputs.firstIndex(where: { $0.name == n }) { inputs[i].muted = (d["inputMuted"] as? Bool) ?? false }
        case "InputVolumeChanged":
            if let n = d["inputName"] as? String, let i = inputs.firstIndex(where: { $0.name == n }), let db = d["inputVolumeDb"] as? Double { inputs[i].db = db }
        default: break
        }
    }

    // MARK: Ordres

    func call(_ method: String, _ params: [String: Any]? = nil) async throws -> [String: Any] {
        guard let t = task, link == .on else { throw RemoteError("Pas connecté au serveur.") }
        seq += 1
        let id = "q\(seq)"
        var msg: [String: Any] = ["type": "req", "id": id, "method": method]
        if let params { msg["params"] = params }
        return try await withCheckedThrowingContinuation { c in
            waiting[id] = c
            Task { try? await t.send(.string(json(msg))) }
        }
    }

    /// Ordre dont l'échec s'affiche en bandeau.
    @discardableResult func run(_ method: String, _ params: [String: Any]? = nil) async -> [String: Any]? {
        do { error = nil; return try await call(method, params) } catch { self.error = (error as? RemoteError)?.message ?? error.localizedDescription; return nil }
    }

    func refresh() async {
        await loadScenes()
        if let s = await run("GetStreamStatus") { streaming = (s["outputActive"] as? Bool) ?? false }
        if let r = await run("GetRecordStatus") { recording = (r["outputActive"] as? Bool) ?? false }
        if let l = await run("GetInputList"), let arr = l["inputs"] as? [[String: Any]] {
            inputs = arr.compactMap { i in
                guard (i["hasAudio"] as? Bool) ?? true, let n = i["inputName"] as? String else { return nil }
                let mul = (i["inputVolumeMul"] as? Double) ?? 1
                return Input(name: n, muted: (i["inputMuted"] as? Bool) ?? false, db: mul > 0 ? 20 * log10(mul) : -100)
            }
        }
    }

    func loadScenes() async {
        if let l = await run("GetSceneList") {
            scenes = (l["scenes"] as? [[String: Any]] ?? []).compactMap { $0["sceneName"] as? String }.reversed()
            currentScene = l["currentProgramSceneName"] as? String ?? currentScene
        }
    }

    func switchScene(_ name: String) async { if await run("SetCurrentProgramScene", ["sceneName": name]) != nil { currentScene = name } }
    func toggleStream() async { await run(streaming ? "StopStream" : "StartStream") }
    func toggleRecord() async { await run(recording ? "StopRecord" : "StartRecord") }
    func setMute(_ name: String, _ muted: Bool) async { await run("SetInputMute", ["inputName": name, "inputMuted": muted]) }
    func setVolume(_ name: String, _ db: Double) async { await run("SetInputVolume", ["inputName": name, "inputVolumeDb": db]) }

    private func startPing() {
        pinger?.cancel()
        pinger = Task { [weak self] in
            while !Task.isCancelled {
                let t0 = Date()
                if (try? await self?.call("link.getInfo")) != nil { self?.latency = Int(Date().timeIntervalSince(t0) * 1000) } else { self?.latency = nil }
                try? await Task.sleep(for: .seconds(5))
            }
        }
    }

    private func json(_ o: [String: Any]) -> String { String(data: (try? JSONSerialization.data(withJSONObject: o)) ?? Data(), encoding: .utf8) ?? "{}" }

    private static func text(_ m: String) -> String {
        ["agent_offline": "OBS n'est pas connecté à SYXTEE.", "timeout": "OBS met trop de temps à répondre.", "rate_limited": "Trop de commandes d'un coup.",
         "method_not_allowed": "Commande refusée.", "forbidden": "Ton invitation ne permet pas cette action."][m] ?? m
    }
}

struct RemoteError: Error { let message: String; init(_ m: String) { message = m } }
