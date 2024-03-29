import React from "react";
import {
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    DialogContent,
    Button,
} from "@fluentui/react-components";
import { TooltipButton } from "./TooltipButton";
import { ArrowDownloadRegular } from "@fluentui/react-icons";

import { makeStyles, tokens, useId, Label, Textarea } from "@fluentui/react-components";
import { LogTag, log } from "../core/log";

const useStyles = makeStyles({
    base: {
        display: "flex",
        flexDirection: "column",
    },
    label: {
        marginBottom: tokens.spacingVerticalMNudge,
    },
});

export function ImportButton({ setImport }: { setImport: (value: string) => void }) {
    const textareaId = useId("import-textarea");
    const styles = useStyles();

    function onClickImport(event: React.FormEvent) {
        event.preventDefault();
        log(LogTag.ButtonImport, "import");
        const value = (document.getElementById(textareaId) as HTMLTextAreaElement).value;
        setImport(value);
    }

    return (
        <Dialog>
            <DialogTrigger disableButtonEnhancement>
                <TooltipButton tip="Import" icon={<ArrowDownloadRegular />} />
            </DialogTrigger>
            <DialogSurface>
                <form onSubmit={onClickImport}>
                    <DialogBody>
                        <DialogTitle>Import Snip Json</DialogTitle>
                        <DialogContent>
                            <div className={styles.base}>
                                <Label className={styles.label} htmlFor={textareaId}>
                                    Paste the JSON
                                </Label>
                                <Textarea id={textareaId} />
                            </div>
                        </DialogContent>
                        <DialogActions>
                            <DialogTrigger disableButtonEnhancement>
                                <Button appearance="secondary">Close</Button>
                            </DialogTrigger>
                            <DialogTrigger disableButtonEnhancement>
                                <Button type="submit" appearance="primary">
                                    Import
                                </Button>
                            </DialogTrigger>
                        </DialogActions>
                    </DialogBody>
                </form>
            </DialogSurface>
        </Dialog>
    );
}
