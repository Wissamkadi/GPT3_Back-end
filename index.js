const express = require("express")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs");
const cors = require("cors");
const User = require("./models/User")
const ResetCode = require("./models/VerifyCode");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");

 const app = express() 
 app.use(express.json())
app.use(cors({
  origin: [
    "http://localhost:5173",          // local dev
    "https://gpt3-tool.netlify.app",  // deployed frontend 
  ],
  credentials: true
}));

const client = new OAuth2Client("871509423731-01v4id2gj98a5pjafcb3pau0rl087c0j.apps.googleusercontent.com");

 //create users
 app.post("/signup", async (req,res)=> {
   
   const { email, password } = req.body
    
   try{
      const ExUser = await User.findOne({email})
      if(ExUser){
         return res.status(400).json({message : "Email already exists"})
      }

    const hashedPassword = await bcrypt.hash(password,10)

     const newUser = new User({
      email,
      password : hashedPassword
     })
      await newUser.save()
      res.json(
         {message:"user has been created successfully",
         user : {
            email : newUser.email,
            name : newUser.name || "",
            picture : newUser.picture || ""
         }
      })
   }catch(error){
      console.error("Signup Error: ",error)
      res.status(500).json({message : "Server Error"})
   }

 })

 app.post("/auth/google/callback", async (req,res) => {
   const {token} = req.body
   console.log("Received token");
   try{
      const ticket = await client.verifyIdToken({
         idToken : token,
         audience : "871509423731-01v4id2gj98a5pjafcb3pau0rl087c0j.apps.googleusercontent.com",
      })

      const payload = ticket.getPayload()
      console.log("Google payload:", {
         email: payload.email,
         name: payload.name,
         picture: payload.picture
      });

      let user = await User.findOne({email : payload.email})
      if(!user){
         user = new User({
            name : payload.name,
            email : payload.email,
            picture : payload.picture,
            // password : ""
         })
         await user.save()
      }
      res.json({message : "Login successful",        
         user: {
            email: user.email,
            name: user.name,
            picture: user.picture
         }
      })
   }catch(error){
      console.log(error)
      res.status(500).json({message : "Server Error during Google authentication"})
   }
 })

app.get("/users/count", async (req, res) => {
  const count = await User.countDocuments();
  res.json({ count });
});

app.post("/signin", async (req,res) => {
   const {email, password} = req.body
   try{
   const user = await User.findOne({email})

   if(!user){
      return res.status(400).json({message : "Invalid Email or Password"})
   }

   if (!user.password) {
      return res.status(400).json({ message: "Please log in with Google" });
   }

   
   const Same = await bcrypt.compare(password , user.password)

   if(!Same){
      return res.status(400).json({message : "Invalid Email or Password"})
   }

   res.json({message : "Login successful",
      user : {
         email : user.email,
         name : user.name || "",
         picture : user.picture || ""
      }  
   })
  }catch(error){
    console.log("Login Error :",error)
    res.status(500).json({message: "Server Error"})
  }
})

   function generateCode() {
    return Math.floor(100000 + Math.random() * 900000) //to get a 6 digit Code
   }

       const transport = nodemailer.createTransport({
         service : "gmail",
         auth : {
            user : "reponzel00k@gmail.com",
            pass : "tgsp hskx zwoh lnwd"
         }
       })

   const SendEmail = async (to, subject, text) => {
      try{
         await transport.sendMail({
            from : "reponzel00k@gmail.com",
            to,
            subject,
            text
         })
         console.log("Email sent successfully !")
      }catch(error){
         console.log("Error sending Email :", error)
      }
   }   
   app.post("/reset", async (req,res) => {

   const {email} = req.body

   const user = await User.findOne({email})
   if(!user){
      return res.status(404).json({message : "User not found"})
   }
   const verfCode = generateCode()
   const time = new Date(Date.now() + 2*60*1000)
   
   await ResetCode.create({email, code : verfCode, time : time})

   await transport.sendMail({
      from : "reponzel00k@gmail.com",
      to : email,
      subject : "Password verification code",
      text : `Your verification code is: ${verfCode}. It expires in 2 minutes`
   })

   res.json({message : "Code sent to email successfully!"})

   })

   app.post("/verifyCode", async (req,res) => {
      const {email, code} = req.body
      const find = await ResetCode.findOne({email, code})

      if(!find){
         return res.status(400).json({error : "Invalid Code"})
      }
      if(find.time < new Date()){
         return res.status(400).json({error : "Code expired"})
      }

      res.json({ message: "Code verified ! , you can reset your password" });
   })

   app.post("/newPassword", async (req,res) => {
     try{
        const {email, newPassword} = req.body
        if(!email || !newPassword){
         return res.status(400).json({error : "Missing Email or Password"})
        }

        const user = await User.findOne({email})
        if(!user){
         return res.status(400).json({error : "User not found"})
        }

         const hashedPassword = await bcrypt.hash(newPassword,10)

         user.password = hashedPassword
         await user.save()
         return res.status(200).json({message : "Password apdated successfully"})
     }catch(err){
         console.error(err)
         return res.status(500).json({ error: "Server error" })
     }
   })

app.get("/", (req, res) => {
  res.json({ message: "Server is up and running!" });
});


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log("Connected to MongoDB Atlas...");
  app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
  });
})
.catch((err) => {
  console.error("MongoDB connection error:", err);
});



