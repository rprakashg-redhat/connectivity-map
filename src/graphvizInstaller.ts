import * as core from "@actions/core";
import * as io from "@actions/io";
import { Command } from "./command";

import { FindBinaryStatus } from "./helper";

export class Installer {
    static async install(runnerOS: string): Promise<FindBinaryStatus> {
        core.debug(`Runner OS: ${runnerOS}`);
        switch (runnerOS.toLowerCase()) {
        case "windows":
            return Installer.chocoInstall();
            break;
        case "linux":
            return Installer.getAptInstall();
            break;
        case "macos":
            return Installer.brewInstall();
            break;
        default:
            throw new Error(`platform '${runnerOS}' is not yet supported`);
        }
    }
    static async brewInstall(): Promise<FindBinaryStatus> {
        // run brew update first
        await Command.execute("brew", [ "update" ]);

        const result = await Command.execute("brew", [ "insstall", "graphviz" ]);
        if (result.exitCode !== 0) {
            return {
                found: false,
                reason: result.error,
            };
        }
        return {
            found: true,
            path: await io.which("dot"),
        };
    }
    static async getAptInstall(): Promise<FindBinaryStatus> {
        // run apt-get update first
        await Command.execute("sudo", [ "apt-get", "update" ]);

        const result = await Command.execute("sudo", [
            "apt-get", "install", "-y", "graphviz", "libgraphviz-dev", "pkg-config",
        ]);
        if (result.exitCode !== 0) {
            return {
                found: false,
                reason: result.error,
            };
        }
        return {
            found: true,
            path: await io.which("dot"),
        };
    }
    static async chocoInstall(): Promise<FindBinaryStatus> {
        const result = await Command.execute("choco", [
            "install",
            "graphviz",
        ]);
        if (result.exitCode !== 0) {
            return {
                found: false,
                reason: result.error,
            };
        }
        return {
            found: true,
            path: await io.which("graphviz"),
        };
    }
}
