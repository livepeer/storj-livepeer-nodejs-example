import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { fromEnv } from "@aws-sdk/credential-providers"
import fetch, { Headers } from "node-fetch"
import fs from "fs"

const STORJ_S3_ENDPOINT = "https://gateway.storjshare.io"
const LIVEPEER_ENDPOINT = "https://livepeer.studio"

const uploadToStorjS3 = async (bucket, filename) => {
	const body = fs.readFileSync(filename)
	const params = {
		Bucket: bucket,
		Key: filename,
		Body: body 
	}

	return await uploadToS3(STORJ_S3_ENDPOINT, params)
}

const uploadToS3 = async (endpoint, params) => {
	const s3Client = new S3Client({
		endpoint,
		// The following env vars must be set:
		// - AWS_ACCESS_KEY_ID
		// - AWS_SECRET_ACCESS_KEY
		region: 'unused',
		credentials: fromEnv(),
	})

	await s3Client.send(
		new PutObjectCommand(params)
	)

	console.log(`Successfully created ${params.Key} and uploaded it to ${params.Bucket}/${params.Key}`)

	// Return path to object within bucket
	return "/" + params.Key
}

const transcodeAndPoll = async params => {
	const taskID = await transcode(params)

	console.log(`Created transcode task ${taskID}`)

	const pollDelay = 10000 // ms
	const maxPolls = 100
	for (let i = 0; i < maxPolls; i++) {
		const status = await getTaskStatus(taskID)
		if (status.phase == "completed") {
			console.log(`Transcode completed and results available at ${params.storage.bucket}${params.outputs.hls.path}`)
			return
		}

		console.log(`Transcode is in progress: ${status.progress ? status.progress : 0}`)

		await sleep(pollDelay)
	}

	console.error(`Transcode took too long, giving up`)
}

const sleep = ms => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

const transcode = async params => {
	const headers = new Headers()
	headers.append("Authorization", `Bearer ${process.env.API_KEY}`)
	headers.append("Content-Type", "application/json")

	const url = `${LIVEPEER_ENDPOINT}/api/transcode`
	const resp = await fetch(url, {
		method: "POST",
		headers: headers,
		body: JSON.stringify(params)
	})
	const data = await resp.json()

	return data.id
}

const getTaskStatus = async id => {
	const headers = new Headers()
	headers.append("Authorization", `Bearer ${process.env.API_KEY}`)
	headers.append("Content-Type", "application/json")

	const url = `${LIVEPEER_ENDPOINT}/api/task/${id}`
	const resp = await fetch(url, {
		method: "GET",
		headers: headers
	})
	const data = await resp.json()

	return data.status
}

const main = async () => {
	const inputPath = await uploadToStorjS3(process.env.BUCKET, process.env.FILENAME)

	const input = {
		type: "s3",
		endpoint: STORJ_S3_ENDPOINT,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
		},
		bucket: process.env.BUCKET,
		path: inputPath
	}
	const storage = {
		type: "s3",
		endpoint: STORJ_S3_ENDPOINT,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
		},
		bucket: process.env.BUCKET
	}
	const outputs = {
		hls: {
			path: process.env.OUTPUT_PATH
		}
	}

	const params = {
		input,
		storage,
		outputs
	}

	await transcodeAndPoll(params)
}

try {
	main()
} catch (err) {
	console.error(err)
}
