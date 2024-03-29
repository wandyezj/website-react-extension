import React, { useState } from "react";

import { Input, Tab, TabList, Toolbar } from "@fluentui/react-components";
import {
    AddRegular,
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
import { objectToJson } from "../core/objectToJson";

export function PageEditor({ initialSnip }: { initialSnip: Snip }) {
    const [fileId, setFileId] = useState("typescript");
    const [snip, setSnip] = useState(initialSnip);

    // TODO: make this more precise in terms of what is updated instead of the entire snip
    const updateSnip = (updatedSnip: Snip) => {
        console.log(`Update snip\t${updatedSnip.id}\t${updatedSnip.name}`);
        // update last modified
        updatedSnip.modified = Date.now();
        saveSnip(updatedSnip);
        setupSnip(updatedSnip);
    };

    const openSnip = (openSnip: Snip) => {
        console.log(`open snip\t${openSnip.id}\t${openSnip.name}`);
        setupSnip(openSnip);
    };

    const setupSnip = (setupSnip: Snip) => {
        saveCurrentSnipId(setupSnip.id);
        // IntelliSense
        const currentLibrary = setupSnip.files.libraries.content;
        const newLibrary = setupSnip.files.libraries.content;
        if (currentLibrary !== newLibrary) {
            updateMonacoLibs(newLibrary);
        }
        setSnip(setupSnip);
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

    const buttonNewSnip = () => {
        log(LogTag.ButtonNew, "button - new snip");
        const newSnip = newDefaultSnip();
        // Open without saving, only save once there is an edit
        openSnip(newSnip);
    };

    /**
     * Copy the current snip to the clipboard
     */
    function buttonCopySnipToClipboard() {
        log(LogTag.ButtonCopy, "button - copy to clipboard");
        const text = objectToJson(snip);
        copyTextToClipboard(text);
    }

    /**
     * Delete the current snip, replace it with the default snip
     */
    function buttonDeleteSnip() {
        log(LogTag.ButtonDelete, "button - delete");
        const previousId = snip.id;
        const newSnip = newDefaultSnip();
        // open the new snip but don't save it until it is edited.
        // note: update saves, which makes it hard to delete snips since each would be replaced by an update
        openSnip(newSnip);
        deleteSnipById(previousId);
    }

    return (
        <>
            <Toolbar>
                <OpenButton openSnip={openSnip} />
                <Input
                    aria-label="Snip Name"
                    type="text"
                    value={snip.name}
                    onChange={(_, { value }) => {
                        console.log(`update snip ${snip.id} name ${value}`);
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
                <TooltipButton tip="New" icon={<AddRegular />} onClick={buttonNewSnip} />
                {/*
                <TooltipButton tip="Run" icon={<PlayRegular />} />
                
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
