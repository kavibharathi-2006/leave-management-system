
const sections = [
    "homeSection",
    "userLoginSection",
    "registerSection",
    "adminLoginSection",
    "userDashboard",
    "adminDashboard"
];

let currentUser = null;
let pendingLeaveDays = {
    casual: 0,
    medical: 0
};

function showSection(sectionId) {
    sections.forEach(id => {
        document.getElementById(id).classList.add("hidden");
    });

    document.getElementById(sectionId).classList.remove("hidden");
    showMessage("");
}

function showMessage(message, isError = false) {
    const element = document.getElementById("message");
    element.textContent = message;
    element.style.color = isError ? "#dc2626" : "#15803d";
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
    }

    return data;
}

// DATE HELPERS
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function setupDateRestrictions() {
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    const today = getLocalDateString();

    // Past dates cannot be selected
    startInput.min = today;
    endInput.min = today;

    // End date cannot be earlier than selected start date
    if (startInput.value) {
        endInput.min = startInput.value > today
            ? startInput.value
            : today;
    }

    startInput.addEventListener("change", () => {
        const currentToday = getLocalDateString();

        startInput.min = currentToday;

        if (startInput.value && startInput.value < currentToday) {
            startInput.value = "";
        }

        endInput.min = startInput.value && startInput.value > currentToday
            ? startInput.value
            : currentToday;

        if (endInput.value && endInput.value < endInput.min) {
            endInput.value = "";
        }
    });

    endInput.addEventListener("change", () => {
        const currentToday = getLocalDateString();

        endInput.min = startInput.value && startInput.value > currentToday
            ? startInput.value
            : currentToday;

        if (endInput.value && endInput.value < endInput.min) {
            endInput.value = "";
            showMessage("Please select a valid end date.", true);
        }
    });
}

// LEAVE BALANCE HELPERS
function updateLeaveAvailability() {
    if (!currentUser) return;

    const casualBalance = Number(currentUser.casualLeave) || 0;
    const medicalBalance = Number(currentUser.medicalLeave) || 0;

    const casualAvailable = Math.max(
        0,
        casualBalance - pendingLeaveDays.casual
    );

    const medicalAvailable = Math.max(
        0,
        medicalBalance - pendingLeaveDays.medical
    );

    document.getElementById("casualBalance").textContent = casualBalance;
    document.getElementById("medicalBalance").textContent = medicalBalance;

    const leaveTypeSelect = document.getElementById("leaveType");
    const casualOption = leaveTypeSelect.querySelector(
        'option[value="casual"]'
    );
    const medicalOption = leaveTypeSelect.querySelector(
        'option[value="medical"]'
    );

    casualOption.disabled = casualAvailable <= 0;
    medicalOption.disabled = medicalAvailable <= 0;

    const submitButton = document.getElementById("submitLeaveButton");
    const balanceMessage = document.getElementById("leaveBalanceMessage");

    const selectedType = leaveTypeSelect.value;
    let selectedAvailable = null;

    if (selectedType === "casual") {
        selectedAvailable = casualAvailable;
    } else if (selectedType === "medical") {
        selectedAvailable = medicalAvailable;
    }

    if (casualAvailable <= 0 && medicalAvailable <= 0) {
        balanceMessage.textContent =
            "No leave balance available for new applications.";
        submitButton.disabled = true;
    } else if (selectedAvailable === 0) {
        balanceMessage.textContent =
            "No available balance for this leave type.";
        submitButton.disabled = true;
    } else {
        balanceMessage.textContent =
            "Choose a leave type with available balance.";
        submitButton.disabled = false;
    }
}

document.getElementById("leaveType").addEventListener("change", () => {
    updateLeaveAvailability();
});

// USER REGISTRATION
document.getElementById("registerForm").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        const data = await apiRequest("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                username: document.getElementById("registerUsername").value.trim(),
                rollNumber: document.getElementById("registerRollNumber").value.trim(),
                email: document.getElementById("registerEmail").value.trim(),
                password: document.getElementById("registerPassword").value
            })
        });

        showMessage(data.message);
        event.target.reset();
        showSection("userLoginSection");
    } catch (error) {
        showMessage(error.message, true);
    }
});

// USER LOGIN
document.getElementById("userLoginForm").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        const data = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: document.getElementById("loginEmail").value.trim(),
                password: document.getElementById("loginPassword").value
            })
        });

        currentUser = data.user;

        document.getElementById("userWelcome").textContent =
            `Welcome, ${currentUser.username}!`;

        event.target.reset();
        showSection("userDashboard");

        setupDateRestrictions();
        await loadMyLeaves();
    } catch (error) {
        showMessage(error.message, true);
    }
});

// ADMIN LOGIN
document.getElementById("adminLoginForm").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        await apiRequest("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({
                email: document.getElementById("adminEmail").value.trim(),
                password: document.getElementById("adminPassword").value
            })
        });

        event.target.reset();
        showSection("adminDashboard");
        await loadAllLeaves();
    } catch (error) {
        showMessage(error.message, true);
    }
});

// APPLY FOR LEAVE
document.getElementById("leaveForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser) {
        showMessage("Please login first.", true);
        return;
    }

    const leaveType = document.getElementById("leaveType").value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const reason = document.getElementById("leaveReason").value.trim();

    if (!leaveType || !startDate || !endDate || !reason) {
        showMessage("Please fill in all leave application fields.", true);
        return;
    }

    const today = getLocalDateString();

    if (startDate < today) {
        showMessage("Past dates are not allowed. Select today or a future date.", true);
        return;
    }

    if (endDate < startDate) {
        showMessage("End date cannot be before start date.", true);
        return;
    }

    const balance = leaveType === "casual"
        ? Number(currentUser.casualLeave) || 0
        : Number(currentUser.medicalLeave) || 0;

    const pendingDays = pendingLeaveDays[leaveType] || 0;
    const availableBalance = Math.max(0, balance - pendingDays);

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const days = Math.round((end - start) / 86400000) + 1;

    if (availableBalance <= 0) {
        showMessage("No leave balance available for this leave type.", true);
        return;
    }

    if (days > availableBalance) {
        showMessage(
            `You have only ${availableBalance} available day(s) for this leave type.`,
            true
        );
        return;
    }

    try {
        const data = await apiRequest("/api/leaves/apply", {
            method: "POST",
            body: JSON.stringify({
                leaveType,
                startDate,
                endDate,
                reason
            })
        });

        showMessage(data.message);
        event.target.reset();
        setupDateRestrictions();
        await loadMyLeaves();
    } catch (error) {
        showMessage(error.message, true);
    }
});

// LOAD USER LEAVE APPLICATIONS AND REFRESH BALANCE
async function loadMyLeaves() {
    try {
        const [leaves, refreshedUser] = await Promise.all([
            apiRequest("/api/leaves/my"),
            apiRequest("/api/auth/me")
        ]);

        currentUser = refreshedUser.user;

        pendingLeaveDays = {
            casual: 0,
            medical: 0
        };

        leaves.forEach(leave => {
            if (leave.status === "Pending") {
                if (leave.leaveType === "casual") {
                    pendingLeaveDays.casual += Number(leave.days) || 0;
                } else if (leave.leaveType === "medical") {
                    pendingLeaveDays.medical += Number(leave.days) || 0;
                }
            }
        });

        updateLeaveAvailability();

        const container = document.getElementById("myLeaves");
        container.replaceChildren();

        if (leaves.length === 0) {
            container.textContent = "No leave applications yet.";
        } else {
            leaves.forEach(leave => {
                const card = document.createElement("div");
                card.className = "leave-card";

                const details = [
                    `Type: ${leave.leaveType}`,
                    `From: ${new Date(leave.startDate).toLocaleDateString()}`,
                    `To: ${new Date(leave.endDate).toLocaleDateString()}`,
                    `Days: ${leave.days}`,
                    `Reason: ${leave.reason}`,
                    `Status: ${leave.status}`,
                    `Admin Remark: ${leave.adminRemark || "None"}`
                ];

                details.forEach(detail => {
                    const p = document.createElement("p");
                    p.textContent = detail;
                    card.appendChild(p);
                });

                container.appendChild(card);
            });
        }
    } catch (error) {
        showMessage(error.message, true);
    }
}

// LOAD ALL LEAVE APPLICATIONS FOR ADMIN
async function loadAllLeaves() {
    try {
        const leaves = await apiRequest("/api/leaves/admin/all");
        const container = document.getElementById("allLeaves");

        container.replaceChildren();

        if (leaves.length === 0) {
            container.textContent = "No leave applications found.";
            return;
        }

        leaves.forEach(leave => {
            const card = document.createElement("div");
            card.className = "leave-card";

            const applicant = leave.userId;

            const details = [
                `Student: ${applicant ? applicant.username : "Unknown"}`,
                `Roll Number: ${applicant ? applicant.rollNumber : "Unknown"}`,
                `Email: ${applicant ? applicant.email : "Unknown"}`,
                `Type: ${leave.leaveType}`,
                `From: ${new Date(leave.startDate).toLocaleDateString()}`,
                `To: ${new Date(leave.endDate).toLocaleDateString()}`,
                `Days: ${leave.days}`,
                `Reason: ${leave.reason}`,
                `Status: ${leave.status}`,
                `Admin Remark: ${leave.adminRemark || "None"}`
            ];

            details.forEach(detail => {
                const p = document.createElement("p");
                p.textContent = detail;
                card.appendChild(p);
            });

            if (leave.status === "Pending") {
                const remark = document.createElement("input");
                remark.placeholder = "Admin remark (optional)";
                remark.maxLength = 300;
                card.appendChild(remark);

                const approveButton = document.createElement("button");
                approveButton.textContent = "Approve";
                approveButton.addEventListener("click", () => {
                    reviewLeave(leave._id, "Approved", remark.value);
                });

                const rejectButton = document.createElement("button");
                rejectButton.textContent = "Reject";
                rejectButton.className = "secondary";
                rejectButton.addEventListener("click", () => {
                    reviewLeave(leave._id, "Rejected", remark.value);
                });

                card.appendChild(approveButton);
                card.appendChild(rejectButton);
            }

            container.appendChild(card);
        });
    } catch (error) {
        showMessage(error.message, true);
    }
}

// ADMIN APPROVE OR REJECT
async function reviewLeave(leaveId, status, adminRemark) {
    try {
        const data = await apiRequest(`/api/leaves/admin/${leaveId}`, {
            method: "PATCH",
            body: JSON.stringify({
                status,
                adminRemark
            })
        });

        showMessage(data.message);
        await loadAllLeaves();
    } catch (error) {
        showMessage(error.message, true);
    }
}

// LOGOUT
async function logout() {
    try {
        await apiRequest("/api/auth/logout", {
            method: "POST",
            body: JSON.stringify({})
        });

        currentUser = null;
        pendingLeaveDays = {
            casual: 0,
            medical: 0
        };

        showSection("homeSection");
        showMessage("Logged out successfully");
    } catch (error) {
        showMessage(error.message, true);
    }
}

// INITIALIZE
setupDateRestrictions();
showSection("homeSection");
