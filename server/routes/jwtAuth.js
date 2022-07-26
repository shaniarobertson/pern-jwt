const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../db");
const jwtGenerator = require ("../utils/jwtGenerator");
const validInfo = require("../middleware/validInfo");
const authorization = require("../middleware/authorization");

// registering
router.post("/register", validInfo, async(req, res) => {
    try {
        // 1. destructure req.body (name, email, password)
        const { name, email, password} = req.body;

        // 2. check if user exists (if user exist then throw error)
        const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [email]);

        if (user.rows.length !== 0) {
            return res.status(401).send("User already exists!");
        }


        // 3. bcrypt user password
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);

        const bcryptPassword = await bcrypt.hash(password, salt); // gives encrypted password

        // 4. enter the user inside our db
        const newUser = await pool.query("INSERT INTO users (user_name, user_email, user_password) VALUES ($1, $2, $3) RETURNING*", [name, email, bcryptPassword]);

        // 5. generating jwt token
        const token = jwtGenerator(newUser.rows[0].user_id);

        res.json({token});

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// login route
router.post("/login", validInfo, async(req, res) =>{
    try {
        // 1. destructure req.body
        const {email, password} = req.body;
        const user = await pool.query("SELECT * FROM users WHERE user_email =$1", [email]);

        // 2. check if user doesn't exist (if not then we throw error)
        if (user.rows.length == 0) {
            return res.status(401).json("Password or Email is incorrect.");
        }

        // 3. check if incoming pw is the same as db pw
        const validPassword = await bcrypt.compare(password, user.rows[0].user_password);

        if(!validPassword) {
            return res.status(401).json("Password or Email is incorrect.");
        }

        // 4. give jwt token
        const token = jwtGenerator(user.rows[0].user_id);

        res.json({token});

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// verifies jwt token upon refresh
router.get("/is-verify", authorization, async(req, res) => {
    try {
        res.json(true);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;