const im = require('imagegick');
const fs = require('fs');
const os = require('os');
const uuidv4 = require('uuid/v4');
const {promisify} = require('util');
const AWS = require('aws-sdk');

const resizeAsync = promisify(im.resize);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink)

AWS.config.update({ region: 'us-east-1' });
const s3 = new AWS.S3();

exports.handler = async (event) => {
    let fileProcessed = event.Records.map( async (record) => {
        let bucket = record.s3.bucket.name;
        let fileName = record.s3.object.key;

        let params = {
            Bucket: bucket,
            Key: fileName
        }

        let inputData = await s3.getObject(params).promise();

        let tempFile = os.tmpdir() + '/' + uuidv4() + '.jpg';

        let resizeArgs = {
            srcData: inputData.Body,
            dstPath: tempFile,
            width: 150
        };

        await resizeAsync(resizeArgs);

        let resizedData = await readFileAsync(tempFile);

        let targetFileName = fileName.substring(0, fileName.lastIndexOf('.')) + '-small.jpg';

        let params = {
            Bucket: bucket + '-dest',
            Key: targetFileName,
            Body: new Buffer(resizedData),
            ContentType: 'iamge/jpeg'
        };

        await s3.putObject(params).promise();

        return await unlinkAsync(tempFile);

    })

    await Promise.all(fileProcessed);

    return 'done';
}