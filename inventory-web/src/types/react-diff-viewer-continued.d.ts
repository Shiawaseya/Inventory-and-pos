declare module "react-diff-viewer-continued" {
  import * as React from "react";

  export enum DiffMethod {
    CHARS = "diffChars",
    WORDS = "diffWords",
    LINES = "diffLines",
    TRIMMED_LINES = "diffTrimmedLines",
    SENTENCES = "diffSentences",
    CSS = "diffCss",
  }

  export interface ReactDiffViewerProps {
    oldValue?: string;
    newValue?: string;
    splitView?: boolean;
    linesOffset?: number;
    disableWordDiff?: boolean;
    compareMethod?: DiffMethod;
    extraLinesSurroundingDiff?: number;
    hideLineNumbers?: boolean;
    showDiffOnly?: boolean;
    renderContent?: (source: string) => React.ReactNode;
    codeFoldMessageRenderer?: (
      totalFoldedLines: number,
      leftStartLineNumber: number,
      rightStartLineNumber: number,
    ) => React.ReactNode;
    onLineNumberClick?: (
      lineId: string,
      event: React.MouseEvent<HTMLTableCellElement>,
    ) => void;
    renderGutter?: (data: {
      lineNumber: number;
      type: string;
      prefix: string;
      value: string | React.ReactNode;
      additionalKey: number;
    }) => React.ReactNode;
    highlightLines?: string[];
    styles?: Record<string, any>;
    useDarkTheme?: boolean;
    leftTitle?: string | React.ReactNode;
    rightTitle?: string | React.ReactNode;
  }

  const ReactDiffViewer: React.FC<ReactDiffViewerProps>;
  export default ReactDiffViewer;
}
