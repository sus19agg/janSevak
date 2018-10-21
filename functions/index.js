const functions = require('firebase-functions');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const config = "fdg8734bsuirrty";
const isAuthenticated = require('./middlewares/auth');

const cors = require('cors');

admin.initializeApp();
const database = admin.database();
const db = database.ref();


const complaints="complaints";



const app = express();
app.use(bodyParser.urlencoded({extended:false}));

app.use(cors({origin: true}));

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});




const googleUrl = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=';


app.get('/testCount', increaseCount);


app.get('/count', getCount);

app.post('/login', googleLogin);
app.put('/user',isAuthenticated, signUp);

app.get('/complaints', getAllComplaints);
app.put('/complaints', isAuthenticated, unsatisfied);
app.post('/user/complaints', isAuthenticated,addUserComplaint);
app.get('/user/complaints', isAuthenticated, myComplaints);
app.put('/user/complaints', isAuthenticated, deleteUserComplaint)
app.post('/user/admin', isAuthenticated, addAdmin);
app.get('/admin/complaints', isAuthenticated, getAdminComplaints);


app.put('/admin/complaints', isAuthenticated, resolveAdminSide);

function googleLogin(req, response) {

	request(googleUrl + req.body.idToken, {json: true}, (err, res, body) => {
		let data;
		if (err) {

			return res.status(400).json({success: false,err:err});
		}

		if (body.error_description !== undefined) {
			return response.status(401).json({
				message: "empty/invalid body received",
				error: 'unauthenticated request',
				success: false,
			});
		}

		let email1 = body.email;
		let email = email1.replace(/\./g, ',');
		let email_child = "users/" + email;
		let ref = database.ref().child(email_child);
		ref.once('value', (snapshot) => {
			if (snapshot.val()) {
				/*	data = {
				onBoard: snapshot.val().onBoard,
				authenticatedRequest: true,
				isRegistered: true,
				body: body
			};*/
			if(snapshot.val().onBoard===true)
			{
				jwttoken={
					email:snapshot.val().email,
					name:snapshot.val().name,
					onBoard:snapshot.val().onBoard,
					phone:snapshot.val().phone,
					address:snapshot.val().address
				}
			}else {
				jwttoken={
					email:snapshot.val().email,
					name:snapshot.val().name,
					onBoard:snapshot.val().onBoard,
				}
			}

			const token = jwt.sign(jwttoken, config);
			data={token:token};
			return response.status(200).json({
				onBoard:snapshot.val().onBoard,
				success: true, data:data
			});
		}
		else {
			database.ref(email_child).set({
				onBoard: false,
				email: body.email,
				name: body.name,
			});
			/*data = {
			onBoard: false,
			authenticatedRequest: true,
			isRegistered: false,
			body: body
		};*/
		jwttoken={
			email:body.email,
			name:body.name,
			onBoard:false,
		};
		const token = jwt.sign(jwttoken, config);
		data={token:token};
		return response.status(200).json({
			onBoard:false,
			success: true, data:data
		});
	}
});
});

}










/*
*   /signUp
*   put:
*      body:
*           phone: Number
*           college: string
*           year: Number
*      description:
*           onboarding data
*      responses:
*           200:
*               description: data updated
*               return:
*                   status: boolean
*           400:
*               description: incomplete parameters
*           403:
*               description: configs not exist
*/
function signUp(req, response) {

	if (req.body.phone === undefined || req.body.address === undefined ) {
		return response.status(400).json({
			success: false,err:'please pass valid/complete url parameters'
		});
	}
	else{
		let email = req.body.email;
		let ref = database.ref('users/'+email);

		ref.once('value', function (snapshot) {
			if(snapshot.val()===null || snapshot.val()===undefined){
				return response.status(403).json({
					success: false,
					err:'user does not exist'
				});

			}
			else if (snapshot.val().onBoard===false) {
				ref.update({
					onBoard: true,
					phone: req.body.phone,
					address: req.body.address,
				});
				jwttoken={
					email:snapshot.val().email,
					name:snapshot.val().name,
					onBoard: true,
					phone: req.body.phone,
					address:snapshot.val().address,
				}
				const token = jwt.sign(jwttoken, config);
				let data={token:token};
				return response.status(200).json({
					success: true,
					message:"user onboarded",
					data:data
				});
			}
			else {

				return response.status(405).json({
					success:false,
					err:'not allowed, already onboarded'
				})

			}
		});
	}

}






function getAllComplaints(req, res) {

	let state=req.query.state;
	let district=req.query.district;
	let category=req.query.category;
	console.log(state, district);
	db.child(complaints).child(state).child(district).child(category).once('value')
	.then(function (snapshot) {

		let userComplaints = snapshot.val();
		console.log(userComplaints);
		let data = {};
		data[complaints] = new Array();

		for(complaint in userComplaints) {

			let obj = {};
			data[complaints].push(userComplaints[complaint]);
		}

		return res.status(200).json({
			success: true,
			data: data
		});
	})
	.catch(() => {

		return res.status(500).json({
			error: "error getting queries",
			success: false
		})
	})

}



function increaseCount(state,district,category)
{
	// let state=req.query.state;
	// let district=req.query.district;
	// let category=req.query.category;
	console.log(state,district,category);
	let temp;
	let prom=database.ref().child("count").child(state).child(district).child(category).once('value',(snapshot)=>{
		temp =snapshot.val();
		console.log('lol');
		console.log(temp);
		if(temp==null ||temp ==undefined)
		{
			temp={
				resolvedCount:0,
				totalCount:0,
			}
		}
		temp.totalCount++;
	})
	prom.then(()=>{
		database.ref().child("count").child(state).child(district).child(category).set(temp);
	}).catch(err => {console.log(err);})
	return;
}

function decrementCount(state,district,category)
{
	// let state=req.query.state;
	// let district=req.query.district;
	// let category=req.query.category;
	console.log(state,district,category);
	let temp;
	let prom=database.ref().child("count").child(state).child(district).child(category).once('value',(snapshot)=>{
		temp =snapshot.val();
		console.log('lol');
		console.log(temp);
		if(temp==null ||temp ==undefined)
		{
			temp={
				resolvedCount:0,
				totalCount:0,
			}
		}
		temp.resolvedCount++;
	})
	prom.then(()=>{
		database.ref().child("count").child(state).child(district).child(category).set(temp);
	}).catch(err => {console.log(err);})
	return;
}


function addUserComplaint(req,res){
	const complaint = req.body.complaint;
	let email=req.body.email;
	const category=req.body.category;
	const state=req.body.state;
	const district=req.body.district;
	increaseCount(state, district, category);

	let tempEmail = email.replace(/,/g,'.');

	console.log(email);
	console.log(tempEmail);
	console.log(complaint);
	let date=Date.now();

	let prom;
	let status;
	prom=database.ref('users').child(email).once('value',(snapshot)=>{
		console.log(snapshot.val().status);
		status=snapshot.val().status;
	})
	prom.then(()=>{
		if(status===false)
		{
			res.status(400).json({
				success:false,
				message:'first give feedback to pending queries',
			})
		}
		const location_child='complaints/'+state+'/'+district+'/'+category;
		let temp;
		if(complaint !== undefined)
		{
			temp =database.ref().child(location_child).child(date).set({
				author:tempEmail,
				complaint:complaint,
				id:date,
				resolved:false,
			});
			temp.then(()=>{
				let details={
					id:date,
					category:category,
					state:state,
					district:district,
					complaint:complaint,
					resolved:false,
				}
				database.ref().child('users').child(email).child(complaints).child(date).set(details);
			})
			.catch(err => {console.log(err);})
			res.status(200).json({
				success:true,
				message : "complaint successfully added"
			});
		}
		else
		{
			res.status(400).json({
				success:false,
				message: "empty complaint"
			})
		}
	})
	.catch(err => {console.log(err);})
	//const email_child='queries/'+email;

}

function deleteUserComplaint(req, res){
	let id=req.body.id;
	let category=req.body.category;
	const state=req.body.state;
	const district=req.body.district;
	let email=req.body.email;
	decrementCount(state, district, category);


	database.ref().child(complaints).child(state).child(district).child(category).child(id).set(null);
	database.ref().child('users').child(email).child(complaints).child(id).set(null);
	res.json({
		success:true,
		message:"complaint deleted"
	});
}



function getCount(req, res)
{
	const state=req.query.state;
	const district=req.query.district;
	console.log(state,district);
	let temp;
	database.ref().child('count').child(state).child(district).once('value',(snapshot)=>{
		console.log(snapshot.val());
		if(snapshot.val()==null){
			res.json({
				resolvedCount:0,
				totalCount:0
			})
		}
		else {
			res.json({data:snapshot.val()})
		}
		// let data={};
		// let counts=[];
		// snapshot.forEach((snap)=>{
		// 	if(snap.val()==null){
		// 		let count={
		// 			resolvedCount:0,
		// 			totalCount:0
		// 		}
		// 		counts.push(count);
		// 	}
		// 	else {
		// 		counts.push(snap.val());
		// 	}
		//
		// })
		// res.json({counts:counts});
	})
}



function myComplaints(req, res){
	let email=req.body.email;
	// let data={};
	database.ref().child('users').child(email).child(complaints).once('value',(snapshot)=>{
		let userComplaints = snapshot.val();
		console.log(userComplaints);
		let data = {};
		data[complaints] = new Array();

		for(complaint in userComplaints) {

			let obj = {};
			data[complaints].push(userComplaints[complaint]);
		}
		return res.status(200).json({
			success: true,
			data: data
		});
	})

}

function unsatisfied(req, res)
{
	let id = req.body.id;
	let state = req.body.state;
	let district=req.body.district;
	let category=req.body.category;
	let email=req.body.email;
	console.log(id, state, category, district);
	let prom;

	prom=database.ref().child('complaints').child(state).child(district).child(category).child(id).update({
		resolved:false
	});
	prom.then(()=>{
		database.ref().child('users').child(email).child(complaints).child(id).update({
			resolved:false
		})
		.catch(err => {console.log(err);})

	});

	res.json({
		success:true,
		message:false
	})
}




function addAdmin(req, res)
{
	let category=req.body.category;
	let district=req.body.district;
	let state=req.body.state;


	let email=req.body.email;

	let prom;

	prom=database.ref().child('admins').child(email).once('value', (snapshot)=>{
		if(snapshot.val()!=null)
		{
			res.json({
				success:false,
				message:'already an admin'
			});
		}
	})

	prom.then(()=>{
		database.ref().child('admins').child(email).set({
			"state":state,
			"district":district,
			"category":category

		})
	}).catch(err => {console.log(err);})

	res.json({
		success:true,
		message:'admin added'
	});
}

function getAdminComplaints(req, res)
{
	let email=req.body.email;
	let category;
	let state;
	let district;
	let prom;
	prom=database.ref().child('admins').child(email).once('value',(snapshot)=>{
		if(snapshot.val()==null)
		{
			let temp={
				"success": true,
				"data": {
					"complaints": []
				}
			}
			return res.json(temp);
		}
		category=snapshot.val().category;
		state=snapshot.val().state;
		district=snapshot.val().district;
	}).catch(err => {console.log(err);})
	prom.then(()=>{
		database.ref().child('complaints').child(state).child(district).child(category).once('value')
		.then(function (snapshot) {

			let userComplaints = snapshot.val();
			console.log(userComplaints);
			let data = {};
			data[complaints] = new Array();

			for(complaint in userComplaints) {

				let obj = {};
				data[complaints].push(userComplaints[complaint]);
			}

			return res.status(200).json({
				success: true,
				data: data
			});
		})
		.catch(() => {

			return res.status(500).json({
				error: "error getting queries",
				success: false
			})
		})
	})
}


// function resolveAdminSide(req, res)
// {
// 	let id = req.body.id;
// 	let state = req.body.state;
// 	let district=req.body.district;
// 	let category=req.body.category;
// 	let prom;
// 	let tempEmail;
// 	let email;
// 	let verify;
// 	prom=database.ref().child('complaints').child(state).child(category).child(id).once('value',(snapshot)=>{
// 		tempEmail=snapshot.val().email;
// 		email=tempEmail.replace(/\./g,',');
// 		console.log(email);
// 	)}
// 	prom.then(()=>{
//
// 		database.ref().child('users').child(email).child('complaints').child(id).update({
// 			"resolved":true
// 		})
// 	}).catch(err => {console.log(err);})
// 	database.ref().child('complaints').child(state).child(district).child(category).child(id).update({
// 		"resolved":true
// 	})
//
// 	res.json({
// 		success:true,
// 	});
//
//
//
//
// }

function resolveAdminSide(req,res)
{
	let id = req.body.id;
	let state = req.body.state;
	let district=req.body.district;
	let category=req.body.category;
	let prom;
	let tempEmail;
	let email=req.body.email;
	let verify;
	prom=database.ref().child('complaints').child(state).child(district).child(category).child(id).update({
		"resolved":true
	})
	prom.then(()=>{
		database.ref().child('users').child(email).child('complaints').child(id).update({
			"resolved":true
		})

	}).catch(err => {console.log(err);})

	res.json({success:true});
}

exports.api = functions.https.onRequest(app);
