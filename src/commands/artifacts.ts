import type { ArgumentsCamelCase, Argv } from 'yargs';
import type { CommandPlugin } from '../types/command.js';
import type { Column } from '../utils/table-formatter.js';
import { formatTable } from '../utils/table-formatter.js';
import { logger } from '../utils/logger.js';
import {
  listArtifacts,
  getArtifact,
  createArtifact,
} from '../api/artifacts.js';

const artifactColumns: Column<any>[] = [
  { header: 'ID', key: 'id', width: 36 },
  { header: 'Name', key: 'name', width: 24 },
  { header: 'Kind', key: 'kind', width: 12 },
  { header: 'Scenario', key: 'scenarioId', width: 24 },
  { header: 'URL', key: 'url', width: 40 },
];

class ListArtifactsCommand implements CommandPlugin {
  readonly name = 'list-artifacts';

  builder(yargs: Argv): Argv {
    return yargs
      .option('scenario-id', {
        describe: 'Filter by scenario ID',
        type: 'string',
      })
      .option('kind', {
        describe: 'Filter by artifact kind',
        type: 'string',
        choices: ['model', 'dataset', 'resultset', 'other'],
      })
      .option('top', {
        describe: 'Maximum number of results',
        type: 'number',
      })
      .option('skip', {
        describe: 'Number of results to skip',
        type: 'number',
      })
      .option('resource-group', {
        describe: 'AI resource group',
        type: 'string',
        default: 'default',
      })
      .option('json', {
        describe: 'Output as JSON',
        type: 'boolean',
        default: false,
      });
  }

  async run(args: ArgumentsCamelCase<any>): Promise<void> {
    const result = await listArtifacts(
      { scenarioId: args.scenarioId as string, kind: args.kind as any, $top: args.top as number, $skip: args.skip as number },
      { 'AI-Resource-Group': args.resourceGroup as string },
    );

    if (!result.success) {
      logger.error(result.error);
      return;
    }

    const artifacts = result.data.resources ?? [];

    if (args.json) {
      logger.info(JSON.stringify(artifacts, null, 2));
      return;
    }

    formatTable(artifacts, artifactColumns);
  }
}

class GetArtifactCommand implements CommandPlugin {
  readonly name = 'get-artifact';

  builder(yargs: Argv): Argv {
    return yargs
      .positional('id', {
        describe: 'Artifact ID',
        type: 'string',
        demandOption: true,
      })
      .option('resource-group', {
        describe: 'AI resource group',
        type: 'string',
        default: 'default',
      })
      .option('json', {
        describe: 'Output as JSON',
        type: 'boolean',
        default: false,
      });
  }

  async run(args: ArgumentsCamelCase<any>): Promise<void> {
    const id = args.id as string;
    const result = await getArtifact(
      id,
      {},
      { 'AI-Resource-Group': args.resourceGroup as string },
    );

    if (!result.success) {
      logger.error(result.error);
      return;
    }

    if (args.json) {
      logger.info(JSON.stringify(result.data, null, 2));
      return;
    }

    formatTable([result.data], artifactColumns);
  }
}

class CreateArtifactCommand implements CommandPlugin {
  readonly name = 'create-artifact';

  builder(yargs: Argv): Argv {
    return yargs
      .option('name', {
        describe: 'Artifact name',
        type: 'string',
        demandOption: true,
      })
      .option('kind', {
        describe: 'Artifact kind',
        type: 'string',
        choices: ['model', 'dataset', 'resultset', 'other'],
        demandOption: true,
      })
      .option('url', {
        describe: 'Artifact URL',
        type: 'string',
        demandOption: true,
      })
      .option('scenario-id', {
        describe: 'Scenario ID',
        type: 'string',
        demandOption: true,
      })
      .option('description', {
        describe: 'Artifact description',
        type: 'string',
      })
      .option('labels', {
        describe: 'Labels as JSON string (array of {key, value})',
        type: 'string',
      })
      .option('resource-group', {
        describe: 'AI resource group',
        type: 'string',
        default: 'default',
      })
      .option('json', {
        describe: 'Output as JSON',
        type: 'boolean',
        default: false,
      });
  }

  async run(args: ArgumentsCamelCase<any>): Promise<void> {
    const name = args.name as string;
    const kind = args.kind as string;
    const url = args.url as string;
    const scenarioId = args.scenarioId as string;

    let labels: Array<{ key: string; value: string }> | undefined;
    if (args.labels) {
      try {
        labels = JSON.parse(args.labels as string);
      } catch {
        logger.error('Invalid JSON for --labels');
        return;
      }
    }

    if (args.dryRun) {
      logger.info(`[Dry Run] Would create artifact "${name}" (${kind}) for scenario ${scenarioId}`);
      return;
    }

    const body: any = { name, kind, url, scenarioId };
    if (args.description) body.description = args.description;
    if (labels) body.labels = labels;

    const result = await createArtifact(
      body,
      { 'AI-Resource-Group': args.resourceGroup as string },
    );

    if (!result.success) {
      logger.error(result.error);
      return;
    }

    if (args.json) {
      logger.info(JSON.stringify(result.data, null, 2));
      return;
    }

    logger.success(`Artifact created successfully.`);
    logger.info(`ID: ${result.data.id}`);
  }
}

export default [
  new ListArtifactsCommand(),
  new GetArtifactCommand(),
  new CreateArtifactCommand(),
];
