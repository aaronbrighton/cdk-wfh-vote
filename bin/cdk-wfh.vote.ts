#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { WfhVotePipelineStack } from '../lib/pipeline';

const app = new cdk.App();
new WfhVotePipelineStack(app, 'pipeline-wfh-vote');