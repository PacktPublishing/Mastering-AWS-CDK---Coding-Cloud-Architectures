import { aws_iam, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { join } from 'path';
import * as iam from 'aws-cdk-lib/aws-iam'

export class HelloCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const handlerFun = new Function(this, 'Hello-lambda', {
      // runtime: Runtime.NODEJS_14_X,
      runtime: Runtime.PYTHON_3_9,
      memorySize: 512,
      handler: 'listLambdas.main',
      code: Code.fromAsset(join(__dirname, '../lambdas')),
       environment: {
          NAME: 'Julia',
          AGE: '23'
       }
    } );

    const listBucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:*'],
      resources: ['*']
    });

    const listLambdasPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:*'],
      resources: ['*']
    });

    handlerFun.role?.attachInlinePolicy(
      new iam.Policy(this, 'list-resources', {
        statements: [listBucketPolicy, listLambdasPolicy]
      })
    )

    new CfnOutput(this, 'function-arn', {value: handlerFun.functionArn})
    

  

  }
}
