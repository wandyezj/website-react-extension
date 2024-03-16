import React, { useState } from "react";

import { Input, Tab, TabList, Toolbar } from "@fluentui/react-components";
import {
    // AddRegular,
    // ArrowDownloadRegular,
    // PlayRegular,
    ClipboardRegular,
    DeleteRegular,
    // BookDefault28Regular,
    // DocumentFolderRegular,
    // SettingsRegular,
} from "@fluentui/react-icons";
import { Snip, completeSnip, getSnipFromJson } from "../core/Snip";
import { saveCurrentSnipId } from "../core/storage";
import { TooltipButton } from "./TooltipButton";
import { updateMonacoLibs } from "../core/updateMonacoLibs";
import { Editor } from "./Editor";
import { ImportButton } from "./ImportButton";
import { deleteSnipById, saveSnip } from "../core/database";
import { newDefaultSnip } from "../core/newDefaultSnip";
import { copyTextToClipboard } from "../core/copyTextToClipboard";
import { LogTag, log } from "../core/log";
import { OpenButton } from "./OpenButton";

export function PageEditor({ initialSnip }: { initialSnip: Snip }) {
    const [fileId, setFileId] = useState("typescript");
    const [snip, setSnip] = useState(initialSnip);

    // TODO: make this more precise in terms of what is updated instead of the entire snip
    const updateSnip = (newSnip: Snip) => {
        const currentLibrary = snip.files.libraries.content;
        const newLibrary = newSnip.files.libraries.content;
        if (currentLibrary !== newLibrary) {
            updateMonacoLibs(newLibrary);
        }
        // update last modified
        newSnip.modified = Date.now();
        saveSnip(newSnip);
        saveCurrentSnipId(newSnip.id);
        setSnip(newSnip);
    };

    const setImport = (value: string) => {
        console.log("Import snip");
        console.log(value);
        const newSnip = getSnipFromJson(value);
        console.log(newSnip);
        if (newSnip) {
            updateSnip(completeSnip(newSnip));
        } else {
            console.error("import failed - invalid snip");
        }
    };

    /**
     * Copy the current snip to the clipboard
     */
    function buttonCopySnipToClipboard() {
        log(LogTag.ButtonCopy, "button - copy to clipboard");

        const text = JSON.stringify(snip, null, 4);
        copyTextToClipboard(text);
    }

    /**
     * Delete the current snip, replace it with the default snip
     */
    function buttonDeleteSnip() {
        log(LogTag.ButtonDelete, "button - delete");
        const previousId = snip.id;
        const newSnip = newDefaultSnip();
        updateSnip(newSnip);
        deleteSnipById(previousId);
    }

    return (
        <>
            <Toolbar>
                <OpenButton />
                <Input
                    aria-label="Snip Name"
                    type="text"
                    value={snip.name}
                    onChange={(_, { value }) => {
                        console.log(`update snip name ${value}`);
                        updateSnip({ ...snip, name: value });
                    }}
                />

                {/* */}
                <TooltipButton
                    tip="Copy to clipboard"
                    icon={<ClipboardRegular />}
                    onClick={buttonCopySnipToClipboard}
                />

                <ImportButton setImport={setImport} />
                {/*
                <TooltipButton tip="Run" icon={<PlayRegular />} />
                <TooltipButton tip="New" icon={<AddRegular />} />
                <TooltipButton tip="Samples" icon={<BookDefault28Regular />} />
                <TooltipButton tip="My Snips" icon={<DocumentFolderRegular />} /> 
                <TooltipButton tip="Settings" icon={<SettingsRegular />} />
                */}
                <TooltipButton tip="Delete" icon={<DeleteRegular />} onClick={buttonDeleteSnip} />
            </Toolbar>
            <TabList
                defaultSelectedValue="typescript"
                onTabSelect={(_, { value }) => {
                    console.log(`setFileId ${value}`);
                    setFileId(value as string);
                }}
            >
                <Tab value="typescript"> TS </Tab>
                <Tab value="html">HTML</Tab>
                <Tab value="css"> CSS</Tab>
                <Tab value="libraries"> Libraries</Tab>
            </TabList>

            <Editor snip={snip} updateSnip={updateSnip} fileId={fileId} />
        </>
    );
}
