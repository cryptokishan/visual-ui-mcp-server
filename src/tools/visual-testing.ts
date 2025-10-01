import fs from "fs-extra";
import * as path from "path";
import { browserManager } from "../browser-manager.js";
import { SecurityUtils } from "../index.js";
import { visualTesting } from "../visual-testing.js";

export async function handleTakeElementScreenshot(server: any, args: any) {
  const elementPage = browserManager.getPage();
  if (!elementPage) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (
    !args ||
    typeof args.selector !== "string" ||
    typeof args.name !== "string"
  ) {
    throw new Error("Selector and name parameters are required");
  }
  // Validate and sanitize the screenshot name
  const sanitizedElementName = SecurityUtils.validateFileName(args.name);
  const elementScreenshot = await visualTesting.takeElementScreenshot(
    elementPage,
    args.selector,
    {
      format: args.format,
      quality: args.quality,
      padding: args.padding,
    }
  );
  const elementPath = path.join(
    process.cwd(),
    "screenshots",
    "current",
    `${sanitizedElementName}.png`
  );
  // Validate the file path is within allowed directories
  SecurityUtils.validateFilePath(
    elementPath,
    SecurityUtils.getAllowedDirectories()
  );
  await fs.writeFile(elementPath, elementScreenshot);
  return {
    content: [
      {
        type: "text",
        text: `Element screenshot saved: ${elementPath}`,
      },
    ],
  };
}

export async function handleTakeResponsiveScreenshots(server: any, args: any) {
  const responsivePage = browserManager.getPage();
  if (!responsivePage) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || typeof args.name !== "string") {
    throw new Error("Name parameter is required");
  }
  // Validate and sanitize the screenshot name
  const sanitizedResponsiveName = SecurityUtils.validateFileName(args.name);
  const breakpoints = Array.isArray(args.breakpoints)
    ? args.breakpoints
    : [320, 768, 1024, 1440];
  const responsiveScreenshots = await visualTesting.takeResponsiveScreenshots(
    responsivePage,
    breakpoints,
    {
      selector: args.selector,
      fullPage: args.fullPage,
    }
  );
  const responsiveResults: string[] = [];
  for (const [width, buffer] of responsiveScreenshots.entries()) {
    const responsivePath = path.join(
      process.cwd(),
      "screenshots",
      "current",
      `${sanitizedResponsiveName}_${width}px.png`
    );
    // Validate the file path is within allowed directories
    SecurityUtils.validateFilePath(
      responsivePath,
      SecurityUtils.getAllowedDirectories()
    );
    await fs.writeFile(responsivePath, buffer);
    responsiveResults.push(`${width}px: ${responsivePath}`);
  }
  return {
    content: [
      {
        type: "text",
        text: `Responsive screenshots saved:\n${responsiveResults.join("\n")}`,
      },
    ],
  };
}

export async function handleDetectVisualRegression(server: any, args: any) {
  const regressionPage = browserManager.getPage();
  if (!regressionPage) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || typeof args.testName !== "string") {
    throw new Error("Test name parameter is required");
  }
  const regressionResult = await visualTesting.compareWithBaseline(
    regressionPage,
    args.testName,
    {
      threshold: args.threshold,
      includeAA: args.includeAA,
    }
  );
  return {
    content: [
      {
        type: "text",
        text: `Visual Regression Results for "${args.testName}":
- Status: ${
          regressionResult.isDifferent ? "REGRESSION DETECTED" : "NO REGRESSION"
        }
- Similarity: ${regressionResult.similarity.toFixed(2)}%
- Total Pixels: ${regressionResult.totalPixels}
- Different Pixels: ${regressionResult.differentPixels}
- Changed Regions: ${regressionResult.changedRegions.length}
${regressionResult.diffImage ? `- Diff image available` : ""}`,
      },
    ],
  };
}

export async function handleUpdateBaseline(server: any, args: any) {
  const baselinePage = browserManager.getPage();
  if (!baselinePage) {
    throw new Error("Browser not launched. Please launch browser first.");
  }
  if (!args || typeof args.testName !== "string") {
    throw new Error("Test name parameter is required");
  }
  await visualTesting.updateBaseline(baselinePage, args.testName);
  return {
    content: [
      {
        type: "text",
        text: `Baseline updated for test: ${args.testName}`,
      },
    ],
  };
}

export async function handleTakeScreenshot(server: any, args: any) {
  return await visualTesting.takeScreenshot(args);
}

export async function handleCompareScreenshots(server: any, args: any) {
  return await visualTesting.compareScreenshots(args);
}
