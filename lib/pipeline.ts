import { Construct, Stage, Stack, StackProps, StageProps } from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, ShellStep } from '@aws-cdk/pipelines';
import { WfhVoteStack } from './wfh-vote-stack';

export class WfhVotePipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection('aaronbrighton/cdk-wfh-vote', 'main', {
          connectionArn: 'arn:aws:codestar-connections:us-east-1:207494070760:connection/7d533ea4-130a-4f4e-a30e-d235652f2357', // Created using the AWS console
        }),
        commands: [
          'npm install',
          'npx cdk synth',
        ],
      }),
      dockerEnabledForSynth: true
    });

    pipeline.addStage(new WfhVote(this, 'deployed')); // Will result in a deployment of deployed-wfh-vote
  }
}
  
class WfhVote extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new WfhVoteStack(this, 'wfh-vote'); // Will be prepended with "deployed" (see pipeline.addStage)
  }
}