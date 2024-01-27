import * as core from "@actions/core";
import * as io from "@actions/io";
import * as uuidV4 from "uuid/v4";
import * as fs from "mz/fs";

import { Inputs } from "./generated/inputs-outputs";
import { Command } from "./command";
import { Installer } from "./graphvizInstaller";
import { FindBinaryStatus } from "./helper";
import { UploadArtifact } from "./uploadArtifact";

export async function run(): Promise<void> {
    const runnerOS = process.env.RUNNER_OS || process.platform;
    const temp = process.env.RUNNER_TEMP;

    const manifestDir = core.getInput(Inputs.MANIFESTS_DIR, { required: true });

    let roxctl = await io.which("roxctl", false);
    if (roxctl === "") {
        core.debug("Couldn't find roxctl in path, defaulting it to current directory");
        roxctl = "./roxctl";
    }

    const mapCmdArgs = [
        "netpol",
        "connectivity",
        "map",
    ];

    // set manifests directory
    mapCmdArgs.push(manifestDir);

    // output format
    mapCmdArgs.push("--output-format=dot");

    // save to file
    mapCmdArgs.push("--save-to-file=true");

    // set output file
    mapCmdArgs.push("--output-file");
    mapCmdArgs.push(`${temp}/connlist.dot`);

    let result = await Command.execute(roxctl, mapCmdArgs);
    if (result.exitCode !== 0) {
        core.setFailed(result.error);
    }
    if (await fs.exists(`${temp}/connlist.dot`)) {
        core.debug("Dot file was created successfully");
    }
    else {
        core.debug("Dot file was not created");
    }
    let graphViz = await io.which("dot", false);
    if (graphViz === "") {
        core.debug("Graphviz not found, installing");
        const binary: FindBinaryStatus = await Installer.install(runnerOS);
        if (binary.found === false) {
            throw new Error(binary.reason);
        }
        core.debug("Installed graphviz");
        graphViz = binary.path;
    }

    // convert dot file to png
    const dotCmdArgs = [
        "-Tpng",
    ];

    dotCmdArgs.push(`${temp}/connlist.dot > ${temp}/connlist.png`);
    result = await Command.execute(graphViz, dotCmdArgs);
    if (result.exitCode !== 0) {
        core.setFailed(result.error);
    }

    // upload both dot file and png file as artifacts
    const artifactName = uuidV4();
    await UploadArtifact.upload(artifactName, [ `${temp}/connlist.dot`, `${temp}/connlist.png` ]);
}
run().catch(core.setFailed);
