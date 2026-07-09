import React, { useState } from 'react';

function Login() {
    const [message, setMessage] = useState('');
    const [loginName, setLoginName] = useState('');
    const [loginPassword, setPassword] = useState('');

    function handleSetLoginName(e: any): void { setLoginName(e.target.value); }
    function handleSetPassword(e: any): void { setPassword(e.target.value); }

    async function doLogin(event: any): Promise<void> {
        event.preventDefault();
        
        // 1. Pack credentials into a standardized JSON string format
        var obj = { login: loginName, password: loginPassword };
        var js = JSON.stringify(obj);

        try {
            // 2. Send the network request directly to your running Express server on Port 5000
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                body: js,
                headers: { 'Content-Type': 'application/json' }
            });

            // 3. Read the validation results coming back from your MongoDB check
            var res = JSON.parse(await response.text());

            if (res.id <= 0) {
                setMessage('User/Password combination incorrect');
            } else {
                // 4. Save session status locally in the browser cache so the dashboard knows who you are
                var user = { firstName: res.firstName, lastName: res.lastName, id: res.id };
                localStorage.setItem('user_data', JSON.stringify(user));

                setMessage('');
                // 5. Instantly forward past the gate into your active dashboard route!
                window.location.href = '/cards';
            }
        } catch (error: any) {
            alert(error.toString());
            return;
        }
    }

    return (
        <div id="loginDiv">
            <span id="inner-title">PLEASE LOG IN</span><br />
            <input type="text" id="loginName" placeholder="Username" onChange={handleSetLoginName} /><br />
            <input type="password" id="loginPassword" placeholder="Password" onChange={handleSetPassword} /><br />
            <input type="submit" id="loginButton" className="buttons" value="Do It" onClick={doLogin} />
            <span id="loginResult">{message}</span>
        </div>
    );
}

export default Login;