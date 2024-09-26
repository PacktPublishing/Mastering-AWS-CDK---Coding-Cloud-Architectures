import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway'
import { join } from 'path';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { TableViewer } from 'cdk-dynamo-table-viewer'


export class CdkQuotesApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const table = new Table(this, 'quotes-tbl', {
       partitionKey: { name: 'id', type: AttributeType.STRING},
       billingMode: BillingMode.PAY_PER_REQUEST,
       removalPolicy: RemovalPolicy.DESTROY
    });


    const handlerFunction = new Function(this, 'quotesHandler', {
       runtime: Runtime.NODEJS_16_X,
       code: Code.fromAsset(join(__dirname, '../lambdas')),
       handler: 'app.handler',
       environment: {
         MY_TABLE: table.tableName
       }
    });

    // grant permission
    table.grantReadWriteData(handlerFunction)



    const api = new RestApi(this, 'quotes-api', {
       description: 'Quotes API',
  
    });

    new TableViewer(this, 'tableviewer', {
      title: 'quotes Table',
      table: table
    });

    // Integration
    const handlerIntegration = new LambdaIntegration(handlerFunction)

    const mainPath = api.root.addResource("quotes");
    const idPath = mainPath.addResource("{id}")
    //...quotes/134435

    mainPath.addMethod("GET",handlerIntegration); // get all
    mainPath.addMethod("POST", handlerIntegration) // post a quote

    idPath.addMethod("DELETE", handlerIntegration);
    idPath.addMethod("GET", handlerIntegration);
    idPath.addMethod("PUT", handlerIntegration);






    

  }
}
