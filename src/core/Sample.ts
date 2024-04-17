import { PrunedSnip, Snip } from "./Snip";
import yaml from "yaml";
import { saveSample } from "./database";

type RawPlaylist = RawPlaylistItem[];

/**
 * YAML
 */
interface RawPlaylistItem {
    name: string;
    description: string;
    rawUrl: string;

    // api_set
    // group
}

/**
 * YAML
 */
interface RawSample {
    name: string;
    description: string;
    script: {
        content: string;
        language: string;
    };
    template: {
        content: string;
        language: string;
    };
    style: {
        content: string;
        language: string;
    };
    libraries: string;
}

export interface SampleMetadata {
    id: string;
    name: string;
    description: string;

    // api_set
    // group
}

/**
 * List of Samples to display only metadata.
 */
export type SampleList = SampleMetadata[];

export interface PrunedSample extends PrunedSnip {
    description: string;
}

export interface Sample extends Snip {
    description: string;
}

function parseRawPlaylist(data: string): RawPlaylist {
    const items = yaml.parse(data) as RawPlaylist;
    return items;
}

function parseRawSample(data: string): RawSample {
    const rawSample = yaml.parse(data) as RawSample;
    return rawSample;
}

// function getSampleListFromRawPlaylist(playlist: RawPlaylist): SampleList {
//     const sampleList = playlist.map((item) => {
//         const { name, description, rawUrl } = item;
//         const id = rawUrl;
//         return {
//             id,
//             name,
//             description,
//         };
//     });
//     return sampleList;
// }

/**
 * Transform library references.
 * - Remove jquery & core-js
 * - Reference CDN for office.js types
 * - Directly reference unpkg for npm packages
 * @returns transformed libraries
 */
function transformLibraries(data: string): string {
    function getLinkFromPackageReference(packageReference: string): string | undefined {
        const reg = /^(?<packageName>.*)@(?<packageVersion>\d+\.\d+\.\d+)\/(?<packageFile>.*)$/;
        const groups = reg.exec(packageReference)?.groups;
        if (groups === undefined) {
            return packageReference;
        }

        const { packageName, packageVersion, packageFile } = groups;

        return `https://unpkg.com/${packageName}@${packageVersion}/${packageFile}`;
    }

    const cleanLibraries = data
        .split("\n")
        .map((line) => {
            line = line.trim();

            // Empty line
            if (line === "") {
                return "";
            }

            // Comment
            if (line.startsWith("//") || line.startsWith("#")) {
                return line;
            }

            // direct reference
            if (line.startsWith("https://") || line.startsWith("http://")) {
                return line;
            }

            // office.js
            if (line === "@types/office-js") {
                return `https://appsforoffice.microsoft.com/lib/1/hosted/office.d.ts`;
            }

            // Remove packages
            const packageNamesIgnore = ["jquery", "@types/jquery", "core-js", "@types/core-js"];
            const isExcluded = packageNamesIgnore.some((packageName) => line.startsWith(packageName));
            if (isExcluded) {
                return undefined;
            }

            // npm reference
            const link = getLinkFromPackageReference(line);
            return link;
        })
        .filter((line) => line !== undefined) as string[];

    const cleanData = cleanLibraries.join("\n");
    return cleanData;
}

function transformTypeScript(data: string): string {
    // TODO: remove jquery
    // / /g`$("#format-vertical-axis").on("click", () => tryCatch(formatVerticalAxis));`;
    return data;
}

function getSampleFromRawSample(rawSample: RawSample, id: string): PrunedSample | undefined {
    // TODO: transform the sample.
    // Update libraries
    // Update typescript

    const { name, description } = rawSample;

    const typescriptContent = transformTypeScript(rawSample.script.content);
    const htmlContent = rawSample.template?.content || "";
    const cssContent = rawSample.style?.content || "";
    const librariesContent = transformLibraries(rawSample.libraries);

    if ([typescriptContent, htmlContent, cssContent, librariesContent].some((content) => content === "")) {
        console.log(`ERROR: Empty content [${rawSample.name}] ${id}`);
        // happens for custom functions
        return undefined;
    }

    const sample: PrunedSample = {
        name,
        description,
        files: {
            typescript: {
                content: typescriptContent,
                language: "typescript",
            },
            html: {
                content: htmlContent,
                language: "html",
            },
            css: {
                content: cssContent,
                language: "css",
            },
            libraries: {
                content: librariesContent,
                language: "text",
            },
        },
    };

    return sample;
}

async function readRawPlaylistData(application: "word" | "excel" | "powerpoint"): Promise<string> {
    const url = `https://raw.githubusercontent.com/OfficeDev/office-js-snippets/main/playlists-prod/${application}.yaml`;
    const response = await fetch(url);
    const text = await response.text();
    return text;
}

async function getSampleFromUrl(url: string): Promise<Sample | undefined> {
    const response = await fetch(url);
    const text = await response.text();
    const rawSample = parseRawSample(text);
    const prunedSample = getSampleFromRawSample(rawSample, url);
    if (prunedSample === undefined) {
        return undefined;
    }

    const sample = {
        ...prunedSample,
        id: url,
        modified: Date.now(),
    };
    return sample;
}

// Take sample snippets on GitHub and transform them for the Build Add-In.
// Sample List
// https://github.com/OfficeDev/office-js-snippets

// Playlists
// https://raw.githubusercontent.com/OfficeDev/office-js-snippets/main/playlists-prod/excel.yaml
// excel, powerpoint, word

/**
 * Load samples into the database.
 */
export async function loadSamplesToDatabase(): Promise<void> {
    console.log("Load Samples To Database - Start");

    // TODO: do for all applications
    const rawPlaylistData = await readRawPlaylistData("excel");
    const rawPlaylist = parseRawPlaylist(rawPlaylistData);
    // what data is in the sample list? This should be built out of the database.
    // there is some extra metadata that is useful
    //const sampleList = getSampleListFromRawPlaylist(rawPlaylist);

    const promises = rawPlaylist.map(async (item) => {
        const { rawUrl } = item;
        const sample = await getSampleFromUrl(rawUrl);
        // Save the sample to the database
        // Can be undefined if there is an issue with the sample
        if (sample) {
            saveSample(sample);
        }
    });
    // What

    await Promise.all(promises);
    console.log("Load Samples To Database - End");
}
