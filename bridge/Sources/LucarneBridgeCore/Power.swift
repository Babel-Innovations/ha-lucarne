import Foundation

public enum Power {
    /// Idle sleep timeout in minutes from `pmset -g` (0 = never), or nil when
    /// it cannot be read. launchd does not fire while the Mac sleeps.
    public static func sleepMinutes(pmsetOutput: String) -> Int? {
        for line in pmsetOutput.split(separator: "\n") {
            let parts = line.split(whereSeparator: { $0 == " " || $0 == "\t" })
            guard parts.count >= 2, parts[0] == "sleep" else { continue }
            return Int(parts[1])
        }
        return nil
    }

    public static func sleepMinutes() -> Int? {
        guard let result = try? LaunchAgent.run("/usr/bin/pmset", ["-g"]) else { return nil }
        return sleepMinutes(pmsetOutput: result.output)
    }
}
