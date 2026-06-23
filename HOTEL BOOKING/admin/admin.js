let state = HotelPortal.loadState();
let currentUser = HotelPortal.getSessionUser(state);
let activeFilter = "all";
let editingMenuId = null;
const ADMIN_TOKEN_KEY = "hotel-portal-admin-token-v1";
const USE_BACKEND = location.protocol === "http:" || location.protocol === "https:";

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  adminDemoLogin: document.querySelector("#adminDemoLogin"),
  accountName: document.querySelector("#accountName"),
  logoutButton: document.querySelector("#logoutButton"),
  todayDate: document.querySelector("#todayDate"),
  activeBookingsCount: document.querySelector("#activeBookingsCount"),
  openRequestsCount: document.querySelector("#openRequestsCount"),
  occupancyMetric: document.querySelector("#occupancyMetric"),
  revenueMetric: document.querySelector("#revenueMetric"),
  taskMetric: document.querySelector("#taskMetric"),
  allBookings: document.querySelector("#allBookings"),
  allRequests: document.querySelector("#allRequests"),
  completedRequests: document.querySelector("#completedRequests"),
  seedDemo: document.querySelector("#seedDemo"),
  menuForm: document.querySelector("#menuForm"),
  menuName: document.querySelector("#menuName"),
  menuDescription: document.querySelector("#menuDescription"),
  menuPrice: document.querySelector("#menuPrice"),
  menuAvailable: document.querySelector("#menuAvailable"),
  menuSubmitButton: document.querySelector("#menuSubmitButton"),
  menuCancelEdit: document.querySelector("#menuCancelEdit"),
  menuAllToggle: document.querySelector("#menuAllToggle"),
  menuRemoveUnavailable: document.querySelector("#menuRemoveUnavailable"),
  menuList: document.querySelector("#menuList"),
  toast: document.querySelector("#toast")
};

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const token = getAdminToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Backend request failed.");
  }

  return payload;
}

async function refreshAdminState() {
  if (!USE_BACKEND || !getAdminToken()) return;

  const [roomsPayload, bookingsPayload, requestsPayload, menuPayload] = await Promise.all([
    api("/api/rooms"),
    api("/api/admin/bookings"),
    api("/api/admin/requests"),
    api("/api/menu")
  ]);

  state = {
    ...state,
    rooms: roomsPayload.rooms,
    bookings: bookingsPayload.bookings,
    requests: requestsPayload.requests,
    menu: Array.isArray(menuPayload.menu) ? menuPayload.menu : []
  };
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function getRoom(roomId) {
  return state.rooms.find((room) => room.id === Number(roomId));
}

function getBooking(bookingId) {
  return state.bookings.find((booking) => booking.id === Number(bookingId));
}

function setToday() {
  els.todayDate.textContent = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date());
}

function setSession(user, token) {
  currentUser = user;
  HotelPortal.setSession(user);
  if (token) setAdminToken(token);
  renderShell();
}

function renderShell() {
  const signedIn = Boolean(currentUser && currentUser.role === "admin");
  els.loginScreen.classList.toggle("hidden", signedIn);
  els.appShell.classList.toggle("hidden", !signedIn);

  if (!signedIn) return;

  els.accountName.textContent = currentUser.name;
  renderAll();
}

function renderAdminBookings() {
  const activeBookings = state.bookings.filter((booking) => booking.status === "confirmed");
  els.allBookings.innerHTML = activeBookings.length ? activeBookings.map((booking) => {
    const room = getRoom(booking.roomId);
    const total = room.price * HotelPortal.nightsBetween(booking.checkIn, booking.checkOut);
    return `
      <article class="list-item">
        <div class="list-line">
          <div>
            <strong>${booking.guest}</strong>
            <span class="muted">Room ${room.number} - ${room.type}</span>
          </div>
          <span class="price">${HotelPortal.money(total)}</span>
        </div>
        <span>${HotelPortal.formatDate(booking.checkIn)} to ${HotelPortal.formatDate(booking.checkOut)}</span>
        <div class="status-actions">
          <button class="status-button" type="button" data-booking-cancel="${booking.id}">Release room</button>
        </div>
      </article>
    `;
  }).join("") : `<div class="empty-state">No active stays for the selected demo period.</div>`;
}

els.allBookings.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-booking-cancel]");
  if (!button) return;

  const bookingId = Number(button.dataset.bookingCancel);
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return;

  if (USE_BACKEND) {
    try {
      const payload = await api(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" })
      });
      state.bookings = state.bookings.map((item) => item.id === bookingId ? payload.booking : item);
    } catch (error) {
      showToast(error.message);
      return;
    }
  } else {
    booking.status = "cancelled";
    HotelPortal.saveState(state);
  }

  renderAll();
  showToast("Booking canceled and room is now available.");
});

function renderRequests() {
  const requests = state.requests.filter((request) => activeFilter === "all" || request.status === activeFilter);
  els.allRequests.innerHTML = requests.length ? requests.map((request) => {
    const booking = getBooking(request.bookingId);
    const room = booking ? getRoom(booking.roomId) : null;
    return `
      <article class="list-item">
        <div class="list-line">
          <div>
            <strong>${HotelPortal.requestLabel(request.type)}</strong>
            <span class="muted">${booking ? `${booking.guest} - Room ${room.number}` : "Booking removed"}</span>
          </div>
          <span class="status ${request.status}">${request.status.replace("_", " ")}</span>
        </div>
        <span>${request.description}</span>
        <div class="status-actions">
          <button class="status-button" type="button" data-request-status="${request.id}:new">New</button>
          <button class="status-button" type="button" data-request-status="${request.id}:in_progress">In progress</button>
          <button class="status-button" type="button" data-request-status="${request.id}:completed">Completed</button>
        </div>
      </article>
    `;
  }).join("") : `<div class="empty-state">No requests match this filter.</div>`;
}

function renderCompletedRequests() {
  const completed = state.requests.filter((request) => request.status === "completed");
  els.completedRequests.innerHTML = completed.length ? completed.map((request) => {
    const booking = getBooking(request.bookingId);
    const room = booking ? getRoom(booking.roomId) : null;
    return `
      <article class="list-item completed-item">
        <div class="list-line">
          <div>
            <strong>${HotelPortal.requestLabel(request.type)}</strong>
            <span class="muted">${booking ? `${booking.guest} - Room ${room.number}` : "Booking removed"}</span>
          </div>
          <span class="status completed">Completed</span>
        </div>
        <span>${request.description}</span>
      </article>
    `;
  }).join("") : `<div class="empty-state">No completed requests yet.</div>`;
}

function renderMetrics() {
  const activeBookings = state.bookings.filter((booking) => booking.status === "confirmed");
  const openRequests = state.requests.filter((request) => request.status !== "completed");
  const revenue = activeBookings.reduce((sum, booking) => {
    const room = getRoom(booking.roomId);
    return sum + room.price * HotelPortal.nightsBetween(booking.checkIn, booking.checkOut);
  }, 0);

  els.activeBookingsCount.textContent = activeBookings.length;
  els.openRequestsCount.textContent = openRequests.length;
  els.occupancyMetric.textContent = `${Math.round((activeBookings.length / state.rooms.length) * 100)}%`;
  els.revenueMetric.textContent = HotelPortal.money(revenue);
  els.taskMetric.textContent = openRequests.length;
}

function setMenuFormEditMode(item = null) {
  if (!item) {
    editingMenuId = null;
    els.menuName.value = "";
    els.menuDescription.value = "";
    els.menuPrice.value = "";
    els.menuAvailable.checked = true;
    els.menuSubmitButton.textContent = "Add menu item";
    els.menuCancelEdit.classList.add("hidden");
    return;
  }

  editingMenuId = item.id;
  els.menuName.value = item.name;
  els.menuDescription.value = item.description;
  els.menuPrice.value = item.price;
  els.menuAvailable.checked = Boolean(item.available);
  els.menuSubmitButton.textContent = "Save menu item";
  els.menuCancelEdit.classList.remove("hidden");
}

function renderMenu() {
  const menuItems = Array.isArray(state.menu) ? state.menu : [];
  if (!menuItems.length) {
    els.menuList.innerHTML = `<div class="empty-state">No menu items are available. Add one from the admin board.</div>`;
    if (els.menuAllToggle) {
      els.menuAllToggle.textContent = "No menu items to update";
      els.menuAllToggle.disabled = true;
    }
    return;
  }

  els.menuList.innerHTML = menuItems.map((item) => `
    <article class="menu-list-item">
      <div>
        <div class="menu-item-label">
          <strong>${item.name}</strong>
          <span class="status">${item.available ? "Available" : "Unavailable"}</span>
        </div>
        <p>${item.description}</p>
      </div>
      <div class="menu-item-actions">
        <button class="secondary-button" type="button" data-menu-edit="${item.id}">Edit</button>
        <button class="secondary-button" type="button" data-menu-toggle="${item.id}">
          ${item.available ? "Mark unavailable" : "Mark available"}
        </button>
        <button class="secondary-button" type="button" data-menu-delete="${item.id}">Remove</button>
      </div>
    </article>
  `).join("");

  if (els.menuAllToggle) {
    const allAvailable = menuItems.every((entry) => entry.available);
    els.menuAllToggle.textContent = allAvailable ? "Mark all unavailable" : "Mark all available";
    els.menuAllToggle.disabled = false;
  }

  if (els.menuRemoveUnavailable) {
    const hasUnavailable = menuItems.some((entry) => !entry.available);
    els.menuRemoveUnavailable.disabled = !hasUnavailable;
  }
}

async function renderAll() {
  try {
    await refreshAdminState();
  } catch (error) {
    showToast(error.message);
  }

  renderAdminBookings();
  renderRequests();
  renderCompletedRequests();
  renderMetrics();
  renderMenu();
}

els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = els.loginUsername.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  if (USE_BACKEND) {
    api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }).then((payload) => {
      if (payload.user.role !== "admin") {
        showToast("Admin access required.");
        return;
      }

      setSession(payload.user, payload.token);
      showToast(`Welcome back, ${payload.user.name}.`);
    }).catch((error) => showToast(error.message));
  } else {
    const user = state.users.find((item) => item.role === "admin" && item.username.toLowerCase() === username && item.password === password);

    if (!user) {
      showToast("Invalid admin username or password.");
      return;
    }

    setSession(user);
    showToast(`Welcome back, ${user.name}.`);
  }
});

els.adminDemoLogin.addEventListener("click", () => {
  if (USE_BACKEND) {
    api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "ISMAIL", password: "ismail123" })
    }).then((payload) => setSession(payload.user, payload.token))
      .catch((error) => showToast(error.message));
  } else {
    const user = state.users.find((item) => item.username === "ISMAIL" && item.role === "admin");
    if (user) setSession(user);
  }
});

document.querySelectorAll(".chip[data-filter]").forEach((chip) => {
  chip.addEventListener("click", () => {
    activeFilter = chip.dataset.filter;
    document.querySelectorAll(".chip[data-filter]").forEach((item) => item.classList.toggle("active", item === chip));
    renderRequests();
  });
});

els.allRequests.addEventListener("click", (event) => {
  const button = event.target.closest("[data-request-status]");
  if (!button) return;

  const [id, status] = button.dataset.requestStatus.split(":");
  const request = state.requests.find((item) => item.id === Number(id));
  if (!request) return;

  if (USE_BACKEND) {
    api(`/api/admin/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }).then(() => {
      if (status === "completed") {
        state.requests = state.requests.filter((item) => item.id !== Number(id));
      }
      renderAll();
      showToast(`Request marked ${status.replace("_", " ")}.`);
    }).catch((error) => showToast(error.message));
  } else {
    if (status === "completed") {
      state.requests = state.requests.filter((item) => item.id !== Number(id));
    } else {
      request.status = status;
    }
    HotelPortal.saveState(state);
    renderAll();
    showToast(`Request marked ${status.replace("_", " ")}.`);
  }
});

els.menuForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const item = {
    name: els.menuName.value.trim(),
    description: els.menuDescription.value.trim(),
    price: Number(els.menuPrice.value),
    available: els.menuAvailable.checked
  };

  if (!item.name || !item.description || Number.isNaN(item.price) || item.price < 0) {
    showToast("Please fill out the menu item with a valid price.");
    return;
  }

  if (editingMenuId) {
    if (USE_BACKEND) {
      api(`/api/admin/menu/${editingMenuId}`, {
        method: "PATCH",
        body: JSON.stringify(item)
      }).then((payload) => {
        state.menu = state.menu.map((entry) => entry.id === editingMenuId ? payload.item : entry);
        renderMenu();
        setMenuFormEditMode(null);
        showToast("Menu item updated.");
      }).catch((error) => showToast(error.message));
    } else {
      state.menu = state.menu.map((entry) => entry.id === editingMenuId ? { ...entry, ...item } : entry);
      HotelPortal.saveState(state);
      renderMenu();
      setMenuFormEditMode(null);
      showToast("Menu item updated.");
    }
    return;
  }

  if (USE_BACKEND) {
    api("/api/admin/menu", {
      method: "POST",
      body: JSON.stringify(item)
    }).then((payload) => {
      state.menu = [payload.item, ...(Array.isArray(state.menu) ? state.menu : [])];
      renderMenu();
      els.menuForm.reset();
      els.menuAvailable.checked = true;
      showToast("Menu item added.");
    }).catch((error) => showToast(error.message));
  } else {
    state.menu = Array.isArray(state.menu) ? state.menu : [];
    state.menu.unshift({ id: Date.now(), ...item });
    HotelPortal.saveState(state);
    renderMenu();
    els.menuForm.reset();
    els.menuAvailable.checked = true;
    showToast("Menu item added.");
  }
});

if (els.menuCancelEdit) {
  els.menuCancelEdit.addEventListener("click", () => setMenuFormEditMode(null));
}

if (els.menuAllToggle) {
  els.menuAllToggle.addEventListener("click", async () => {
    const menuItems = Array.isArray(state.menu) ? state.menu : [];
    if (!menuItems.length) return;

    const allAvailable = menuItems.every((entry) => entry.available);
    const newAvailable = !allAvailable;

    if (USE_BACKEND) {
      try {
        const payload = await api("/api/admin/menu/availability", {
          method: "PATCH",
          body: JSON.stringify({ available: newAvailable })
        });
        state.menu = Array.isArray(payload.menu) ? payload.menu : state.menu.map((entry) => ({ ...entry, available: newAvailable }));
      } catch (error) {
        showToast(error.message);
        return;
      }
    } else {
      state.menu = menuItems.map((entry) => ({ ...entry, available: newAvailable }));
      HotelPortal.saveState(state);
    }

    renderMenu();
    showToast(`All menu items marked ${newAvailable ? "available" : "unavailable"}.`);
  });
}

if (els.menuRemoveUnavailable) {
  els.menuRemoveUnavailable.addEventListener("click", async () => {
    const menuItems = Array.isArray(state.menu) ? state.menu : [];
    const unavailableItems = menuItems.filter((entry) => !entry.available);
    if (!unavailableItems.length) {
      showToast("There are no unavailable menu items to remove.");
      return;
    }

    if (USE_BACKEND) {
      try {
        await api("/api/admin/menu/unavailable", { method: "DELETE" });
        state.menu = state.menu.filter((entry) => entry.available);
      } catch (error) {
        showToast(error.message);
        return;
      }
    } else {
      state.menu = menuItems.filter((entry) => entry.available);
      HotelPortal.saveState(state);
    }

    renderMenu();
    showToast("Removed all unavailable menu items.");
  });
}

els.menuList.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-menu-edit]");
  const toggle = event.target.closest("[data-menu-toggle]");
  const remove = event.target.closest("[data-menu-delete]");
  if (!edit && !toggle && !remove) return;

  const id = Number((edit || toggle || remove).dataset.menuEdit || (edit || toggle || remove).dataset.menuToggle || (edit || toggle || remove).dataset.menuDelete);
  const item = (state.menu || []).find((entry) => entry.id === id);
  if (!item) return;

  if (edit) {
    setMenuFormEditMode(item);
    return;
  }

  if (toggle) {
    const updated = { ...item, available: !item.available };
    if (USE_BACKEND) {
      api(`/api/admin/menu/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ available: updated.available, name: updated.name, description: updated.description, price: updated.price })
      }).then((payload) => {
        state.menu = state.menu.map((entry) => entry.id === id ? payload.item : entry);
        renderMenu();
        showToast(`Menu item ${payload.item.available ? "marked available" : "marked unavailable"}.`);
      }).catch((error) => showToast(error.message));
    } else {
      item.available = updated.available;
      HotelPortal.saveState(state);
      renderMenu();
      showToast(`Menu item ${item.available ? "marked available" : "marked unavailable"}.`);
    }
    return;
  }

  if (remove) {
    if (USE_BACKEND) {
      api(`/api/admin/menu/${id}`, { method: "DELETE" }).then(() => {
        state.menu = state.menu.filter((entry) => entry.id !== id);
        renderMenu();
        showToast("Menu item removed.");
      }).catch((error) => showToast(error.message));
    } else {
      state.menu = state.menu.filter((entry) => entry.id !== id);
      HotelPortal.saveState(state);
      renderMenu();
      showToast("Menu item removed.");
    }
  }
});

els.seedDemo.addEventListener("click", () => {
  if (USE_BACKEND) {
    api("/api/admin/reset", { method: "POST" }).then(() => {
      renderAll();
      showToast("Demo data reset.");
    }).catch((error) => showToast(error.message));
  } else {
    state = HotelPortal.resetState();
    currentUser = HotelPortal.getSessionUser(state);
    renderShell();
    showToast("Demo data reset.");
  }
});

els.logoutButton.addEventListener("click", () => {
  HotelPortal.clearSession();
  clearAdminToken();
  currentUser = null;
  renderShell();
  showToast("Signed out.");
});

HotelPortal.saveState(state);
setToday();
if (USE_BACKEND && currentUser && currentUser.role === "admin" && !getAdminToken()) {
  currentUser = null;
}
renderShell();
