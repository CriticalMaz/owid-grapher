/* Admin.ts
 * ================
 *
 * Singleton which governs interaction with the grapher admin server.
 */

class Admin {
    url(path: string): string {
        return Global.rootUrl + path;
    }

    get csrfToken() {
        const meta = document.querySelector("[name=_token]")
        if (!meta)
            throw new Error("Could not find csrf token")
        return meta.getAttribute("value")
    }

    fetchJSON(path: string) {
        return window.fetch(this.url(path), { credentials: 'same-origin' }).then(function(data) { return data.json(); });
    }

    request(path: string, data: Object, method: 'PUT'|'POST') {
        return window.fetch(this.url(path), {
            method: method,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRFToken': this.csrfToken
            },
            body: JSON.stringify(data)
        })
    }
}

const admin = new Admin()
window.Admin = admin
export default admin