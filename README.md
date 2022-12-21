# storj-livepeer-example

## Install

```
npm install
```

## Set Environment Variables

The following environment variables must be set:

```
# The Storj S3 access key
export AWS_ACCESS_KEY_ID=
# The Storj S3 secret key
export AWS_SECRET_ACCESS_KEY=

# The Livepeer Studio API key
export API_KEY=

# The Storj bucket name
export BUCKET=
# The name of the file to upload to Storj and to transcode
export FILENAME=
# The path that the transcoded results should be stored under (must start with leading forward slash)
export OUTPUT_PATH=
```

## Run

```
node main.js
```