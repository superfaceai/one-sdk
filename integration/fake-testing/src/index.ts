import * as child_process from 'child_process'
import { join as joinPath } from 'path';

import { err, ok } from '@superfaceai/one-sdk';
import { SuperfaceTestConfig, NockConfig, SuperfaceTestRun, RecordingProcessOptions, TestingReturn, AlertFunction } from '@superfaceai/testing';
import { IGenerator } from '@superfaceai/testing/dist/generate-hash';
import { mapError, parseTestInstance } from '@superfaceai/testing/dist/superface-test.utils';

import { MappedError } from '@superfaceai/one-sdk/dist/core/interpreter/map-interpreter.errors';
import { RecordingType } from './nock/recording.interfaces';

// re-export interfaces, we need to match real testing
export { SuperfaceTestConfig, NockConfig, SuperfaceTestRun, RecordingProcessOptions, TestingReturn, AlertFunction, RecordingDefinitions } from '@superfaceai/testing';

export class SuperfaceTest {
  public configuration: SuperfaceTestConfig | undefined;
  
  private generator: IGenerator;
  constructor(payload?: SuperfaceTestConfig, nockConfig?: NockConfig) {
    this.configuration = payload;

    const testInstance = parseTestInstance(nockConfig?.testInstance);
    this.generator = testInstance.generator;
  }

  async run(
    testCase: SuperfaceTestRun,
    options?: RecordingProcessOptions
  ): Promise<TestingReturn> {
    const profile = testCase.profile ?? this.configuration?.profile;
    const provider = testCase.provider ?? this.configuration?.provider;
    const usecase = testCase.useCase ?? this.configuration?.useCase;
    if (
      typeof profile !== 'string'
      || typeof provider !== 'string'
      || typeof usecase !== 'string'
    ) {
      throw new Error('unimplemented');
    }

    const input = testCase.input;
    let recordingTypePrefix = '';
    if (options?.recordingType !== undefined && options.recordingType !== RecordingType.MAIN) {
      recordingTypePrefix = options?.recordingType;
    }
    const recordingKey = `${recordingTypePrefix}.${profile}.${provider}.${usecase}.${this.generator.hash(testCase)}`;
    const coreRunner = joinPath(process.env['SF_CORE_ROOT']!!, 'host/python/test_station.py');

    const result: Record<string, unknown> = await new Promise((resolve, reject) => {
      const child = child_process.execFile(
        coreRunner,
        [recordingKey],
        {
          maxBuffer: 5 * 1024 * 1024
        },
        (error: unknown, stdout: string, stderr: string) => {
          if (error !== null) {
            reject(error);
          } else {
            // console.log('stderr:', stderr);
            try {
              const result = JSON.parse(stdout);
              if (result == null || typeof result !== 'object') {
                throw new Error('Invalid response');
              }
              resolve(result);
            } catch (error) {
              reject({ error, stdout, stderr });
            }
          }
        }
      );

      child.stdin?.write(JSON.stringify(input));
      child.stdin?.end();
    });

    if (result['Err'] !== undefined) {
      return err(mapError(
        new MappedError('Expected error', undefined, result['Err'])
      ));
    } else {
      return ok(result['Ok'] ?? undefined);
    }
  }

  static async report(
    _alert: AlertFunction,
    _options?: { onlyFailedTests?: boolean; }
  ): Promise<void> {
    throw new Error('unimplemented');
  }
}