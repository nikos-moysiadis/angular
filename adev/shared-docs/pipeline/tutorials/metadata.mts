/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {join, relative} from 'path';
import {glob} from 'tinyglobby';
import {
  FileAndContentRecord,
  PackageJson,
  TutorialConfig,
  TutorialMetadata,
} from '../../interfaces';
import {getFileContents} from './utils.mjs';
import assert from 'assert';

/** Generate the metadata.json content for a provided tutorial config. */
export async function generateMetadata(
  path: string,
  config: TutorialConfig,
  files: FileAndContentRecord,
): Promise<TutorialMetadata> {
  const tutorialFiles: FileAndContentRecord = {};
  const {dependencies, devDependencies} = JSON.parse(
    files['package.json'] as string,
  ) as PackageJson;

  config.openFiles?.forEach((file) => (tutorialFiles[file] = files[file]));

  return {
    type: config.type,
    openFiles: config.openFiles || [],
    allFiles: Object.keys(files),
    tutorialFiles,
    answerFiles: await getAnswerFiles(path, config, files),
    hiddenFiles: config.openFiles
      ? Object.keys(files).filter((filename) => !config.openFiles!.includes(filename))
      : [],
    dependencies: {
      ...dependencies,
      ...devDependencies,
    },
  };
}

/** Generate the answer files for the metadata.json. */
async function getAnswerFiles(
  path: string,
  config: TutorialConfig,
  files: FileAndContentRecord,
): Promise<FileAndContentRecord> {
  const answerFiles: FileAndContentRecord = {};
  const answerPrefix = /answer[\\/]/;

  if (config.answerSrc) {
    assert(config.answerRootDir, `No \`answerRootDir\` specified for: ${path}`);

    const answersDir = join(path, config.answerSrc);
    const answerRootDir = join(path, config.answerRootDir);

    const answerFilePaths = await glob('**/*', {
      cwd: answersDir,
      onlyFiles: true,
      absolute: false,
    });

    for (const answerFile of answerFilePaths) {
      const absAnswerFile = join(answersDir, answerFile);
      // Relativize answer file path.
      const filePath = relative(answerRootDir, absAnswerFile);
      // We use the absolute file in order to read the content, but the key
      // needs to be a relative path within the project.
      answerFiles[filePath] = getFileContents(absAnswerFile);
    }
  } else {
    for (const file of Object.keys(files)) {
      if (answerPrefix.test(file)) {
        answerFiles[file.replace(answerPrefix, '')] = files[file];
      }
    }
  }

  return answerFiles;
}
