import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSource from 'aws-cdk-lib/aws-lambda-event-sources';
import { join } from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import  * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';


export class EmailServiceCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

  // create SQS
  const inquiryQueue = new sqs.Queue(this, 'inquiryProcessingQueue', {
    visibilityTimeout: Duration.seconds(45),
    queueName: 'inquiry-processing-queue',
  });

  // create an sqs event source
  const lambdaSqsEventSource = new lambdaEventSource.SqsEventSource(inquiryQueue, {
    batchSize: 10,
    enabled: true,
  });

    // create the lambda responsible for processing inquiries
const processInquiryFunction = new lambda.Function(this, 'ProcessOInquiryLambda', {
  code: lambda.Code.fromAsset(join(__dirname,'../lambdas')),
  handler: 'handler.processInquiry',
  runtime: lambda.Runtime.NODEJS_16_X,
});

// attach the event source to the orderProcessing lambda, so that Lambda can poll the queue and invoke the inqiryprocessing Lambda
processInquiryFunction.addEventSource(lambdaSqsEventSource);


// grant the inquiry process lambda permission to invoke SES
processInquiryFunction.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['ses:*'],
  //actions: ['ses:SendRawEmail', 'ses:SendTemplatedEmail', 'ses:SendEmail'],
  resources: ['*'],
  sid: 'SendEmailPolicySid',
}));

// provision the dynamoDB
const inquiryTable = new dynamodb.Table(this, 'InquiryTbl', {
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.DEFAULT,
  pointInTimeRecovery: false,
});

const createInquiryFunction = new lambda.Function(this, 'CreateInquiryLambda', {
  code: lambda.Code.fromAsset(join(__dirname,'../lambdas')),
  handler: 'handler.createInquiry',
  runtime: lambda.Runtime.NODEJS_16_X,
  memorySize: 256,
  timeout: Duration.seconds(10),
  environment: {
    INQUIRY_TABLE_NAME: inquiryTable.tableName,
    INQUIRY_PROCESSING_QUEUE_URL: inquiryQueue.queueUrl,
    ADMIN_EMAIL: '<<YOUR_ADMIN_EMAIL>>',
    
  }
});
inquiryTable.grantWriteData(createInquiryFunction); 
inquiryQueue.grantSendMessages(createInquiryFunction);


 // creates an API Gateway REST API
const restApi = new apigateway.RestApi(this, 'EmailServiceApi', {
  restApiName: 'EmailService',
});

const newInquiries = restApi.root.addResource('inquiries')
  .addResource('new');
  // creating a POST method for the new order resource that integrates with the createOrder Lambda function
  newInquiries.addMethod('POST', new apigateway.LambdaIntegration(
    createInquiryFunction), {
    authorizationType: apigateway.AuthorizationType.NONE,
  });

    
  }
}
