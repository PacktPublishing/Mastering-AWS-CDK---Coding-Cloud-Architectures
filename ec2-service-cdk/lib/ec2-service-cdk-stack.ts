import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { KeyPair } from 'cdk-ec2-key-pair';
import { readFileSync } from 'fs';


export class Ec2ServiceCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const key = new KeyPair(this, 'KeyPair', {
         name: 'cdk-keypair',
         description: 'Key Pair created with CDK Deployment',
       });
       key.grantReadOnPublicKey

       //import default vpc
       const vpc = ec2.Vpc.fromLookup(this, 'default-vpc', {
         isDefault: true
       });

       // create SG for the ec2 instance
       const webSG = new ec2.SecurityGroup(this, 'webSG', {
         vpc,
         allowAllOutbound: true
       });

       webSG.addIngressRule(ec2.Peer.anyIpv4(),
       ec2.Port.tcp(80),
       'allow HTTP traffic form anywhere');

       //For SSH!!
       webSG.addIngressRule(ec2.Peer.anyIpv4(),
       ec2.Port.tcp(22),
       'Allow SSH Access')

       
       // create the EC2 instance
       const ec2Instance = new ec2.Instance(this, 'webserver-ec2-instance', {
         keyName: key.keyPairName,
         vpc,
         vpcSubnets: {
           subnetType: ec2.SubnetType.PUBLIC,

         },
         securityGroup: webSG,
         instanceType: ec2.InstanceType.of(
           ec2.InstanceClass.BURSTABLE2,
           ec2.InstanceSize.MICRO
         ),
         machineImage: new ec2.AmazonLinuxImage({
           generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
         })
       });

       // load user data script
       // for a simple httpd server!
       const userData = readFileSync('./lib/user-data.sh', 'utf8');

      
       // add user data to the ec2 instance
       ec2Instance.addUserData(userData)

       //create outputs for connecting
       new CfnOutput(this, 'public dns name', { value: ec2Instance.instancePublicDnsName });
       new CfnOutput(this, 'IP address', { value: ec2Instance.instancePublicIp });

        new CfnOutput(this, 'Key Name', { value: key.keyPairName })
        new CfnOutput(this, 'Download Key Command', { value: 'aws secretsmanager get-secret-value --secret-id ec2-ssh-key/cdk-keypair/private --query SecretString --output text > cdk-key.pem && chmod 400 cdk-key.pem' })
        new CfnOutput(this, 'ssh command', { value: 'ssh -i cdk-key.pem -o IdentitiesOnly=yes ec2-user@' + ec2Instance.instancePublicIp })


  }
}
