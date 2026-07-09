import React from 'react';

function CardUI() {
    // Read the user session data we stored during login
    let _ud: any = localStorage.getItem('user_data');
    let ud = JSON.parse(_ud || '{}');
    
    function doLogout(event: any): void {
        event.preventDefault();
        localStorage.removeItem("user_data");
        window.location.href = '/';
    }

    return (
        <div id="accessUIDiv">
            <h2>Welcome Back, {ud.firstName || 'User'}!</h2>
            <p>Your database account is active.</p>
            <button type="button" className="buttons" onClick={doLogout}>Log Out</button>
        </div>
    );
}

export default CardUI;