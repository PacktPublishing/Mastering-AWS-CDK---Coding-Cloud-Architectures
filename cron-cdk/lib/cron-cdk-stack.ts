import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import lambda = require('aws-cdk-lib/aws-lambda');
import fs = require('fs');
import { join } from 'path';
import events = require('aws-cdk-lib/aws-events');
import targets = require('aws-cdk-lib/aws-events-targets');


export class CronCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const handlerFunction = new lambda.Function(this, 'CronQuote', {
      code: lambda.Code.fromAsset(join(__dirname, '../lambdas')),
      //code: new lambda.InlineCode(fs.readFileSync('lambda-handler.py', { encoding: 'utf-8' })),
      handler: 'app.handler',
      timeout: Duration.seconds(300),
      runtime: lambda.Runtime.PYTHON_3_9,
    });

    // See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
    const rule = new events.Rule(this, 'Cron-rule', {
        schedule: events.Schedule.expression('cron(0 18 ? * MON-FRI *)')
    });

    rule.addTarget(new targets.LambdaFunction(handlerFunction))


    
  }
}
