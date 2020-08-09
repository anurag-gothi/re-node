import mongoose from "mongoose";
import bcrypt  from "bcryptjs"
import { sign, verify }  from "jsonwebtoken"
import sendMail  from "../utils/mailer"
const Schema = mongoose.Schema;
    
// User Schema
const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        
        email: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        password: {
            type: String,
            required:true,
            trim: true
        },
        accessToken: {
            type: String,
            trim: true
        },
        resetToken: {
            type: String,
            trim: true
        },
        verified_email: {
            type: Boolean,
            default: 0
        },
        taggedPost:[
            {
                type: Schema.Types.ObjectId,
                ref: "post"
            }
        ],
        friends: [{ type: Schema.Types.ObjectId, ref: 'friend'}]

    },
    { timestamps: true}
);

//static method to find user by email and password
userSchema.statics.findByEmailAndPassword = async (email, password) => {
    try {
        const user = await User.findOne({ email: email});
        if(!user) throw new Error("Invalid Credentials");
        if(process.env.NODE_ENV!='test'){
            const isMatched = await bcrypt.compare(password, user.password);
            if(!isMatched) throw new Error("Invalid Credentials");
        }
        else if(process.env.NODE_ENV=='test'){
            if(user.password!=password){
                throw new Error("Invalid Credentials");
            }
        }
        return user;
    } catch (err) {
        err.name = 'AuthError';
        throw err;
    }
};

// Methods used to Generate JWT Token
userSchema.methods.generateAuthToken = async function(mode) {
    const user = this;

    if(mode === "confirm") {

        const accessToken = await sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
            expiresIn: "24h"
        });
        user.accessToken = accessToken;
        if(process.env.NODE_ENV=='test'){
            user.verified_email = true
            await user.save();
        }
        else{
            await user.save();
            await sendMail(mode, user.email, accessToken);
        }

    } else if( mode === "reset") {
        const resetToken = await sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
            expiresIn: "15m"
        });
        user.resetToken = resetToken;
        await user.save();
        await sendMail(mode, user.email,resetToken);
    }
    
  
}

// Methods used to Generate JWT Token during Login
userSchema.methods.regenerateAuthToken = async function() {
    const user = this
    const token = await sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: "24h"
    });
    user.accessToken = token;
    await user.save()
    return token
}

//static method to null the accessToken of the user
userSchema.statics.nullifyToken = async (token) => {
    try {
        const user = await User.findOne({accessToken: token})
        user.accessToken = null;
        user.save();
        return user
        
    } catch (err) {
        console.log(err.message)   
    }
}

//static method to find user by password
userSchema.statics.findByPassword = async (accessToken, oldpassword) => {
    try {
        const user = await User.findOne({accessToken:accessToken});
        if(!user) throw new Error("Invalid Credentials");
        const isMatched = await bcrypt.compare(oldpassword, user.password);
        if(!isMatched) throw new Error("Invalid Credentials");
        return user;
    } catch (err) {
        err.name = 'AuthError';
        throw err;
    }
};

//static method to find user by email 
userSchema.statics.findByEmail = async (email) => {
    try {
        const user = await User.find({ email: email})
        if(!user) throw new Error("Invalid Credentials");
        return user
    } catch (err) {
        err.name = 'AuthError';
        throw err;
    }
};

//static method to find user by Token
userSchema.statics.findByToken = async (token) => {
    try {
      const user = await User.find({ accessToken: token });
      if(!user) throw new Error("Invalid Credentials");
      const payload = await verify(token, process.env.JWT_SECRET_KEY);
      //console.log(payload)
      if(payload) {
        user[0].verified_email = true;
        await user[0].save()
        return user
      }
    }
    catch (err) {
      console.log(err)
      err.name = "Invalid Credentials";
      throw err;
    }
  }

userSchema.pre("save", async function(next) {
    const user = this;
    try {
        if(user.isModified("password")) {
            const hashedpassword = await bcrypt.hash(user.password, 10);
            user.password = hashedpassword;
            next()
        }
    } catch (err) {
        console.log(err.message)
        next(err)        
    }

});

const User = mongoose.model("user", userSchema);

module.exports = User;