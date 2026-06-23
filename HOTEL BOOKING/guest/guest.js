let state = HotelPortal.loadState();
let currentUser = HotelPortal.getSessionUser(state);
const USE_BACKEND = location.protocol === "http:" || location.protocol === "https:";
const MENU_REFRESH_INTERVAL = 7000;
let menuRefreshIntervalId = null;

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  appShell: document.querySelector("#appShell"),
  loginModeButton: document.querySelector("#loginModeButton"),
  registerModeButton: document.querySelector("#registerModeButton"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  registerName: document.querySelector("#registerName"),
  registerMobile: document.querySelector("#registerMobile"),
  registerUsername: document.querySelector("#registerUsername"),
  registerPassword: document.querySelector("#registerPassword"),
  guestDemoLogin: document.querySelector("#guestDemoLogin"),
  accountName: document.querySelector("#accountName"),
  accountPhone: document.querySelector("#accountPhone"),
  logoutButton: document.querySelector("#logoutButton"),
  todayDate: document.querySelector("#todayDate"),
  activeBookingsCount: document.querySelector("#activeBookingsCount"),
  openRequestsCount: document.querySelector("#openRequestsCount"),
  checkIn: document.querySelector("#checkIn"),
  checkOut: document.querySelector("#checkOut"),
  searchForm: document.querySelector("#searchForm"),
  roomGrid: document.querySelector("#roomGrid"),
  menuStatus: document.querySelector("#menuStatus"),
  menuGrid: document.querySelector("#menuGrid"),
  myBookings: document.querySelector("#myBookings"),
  requestForm: document.querySelector("#requestForm"),
  requestBooking: document.querySelector("#requestBooking"),
  requestType: document.querySelector("#requestType"),
  requestDescription: document.querySelector("#requestDescription"),
  myRequests: document.querySelector("#myRequests"),
  seedDemo: document.querySelector("#seedDemo"),
  toast: document.querySelector("#toast")
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Backend request failed.");
  }
  return payload;
}

function getRoom(roomId) {
  return state.rooms.find((room) => room.id === Number(roomId));
}

function getGuestBookings() {
  if (!currentUser) return [];
  return state.bookings.filter((booking) => booking.userId === currentUser.id);
}

function setDefaultDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 3);

  els.checkIn.valueAsDate = tomorrow;
  els.checkOut.valueAsDate = dayAfter;
  els.todayDate.textContent = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(today);
}

function setAuthMode(mode) {
  const isRegister = mode === "register";
  els.loginForm.classList.toggle("hidden", isRegister);
  els.registerForm.classList.toggle("hidden", !isRegister);
  els.loginModeButton.classList.toggle("active", !isRegister);
  els.registerModeButton.classList.toggle("active", isRegister);
}

function setSession(user) {
  currentUser = user;
  HotelPortal.setSession(user);
  renderShell();
}

function renderShell() {
  const signedIn = Boolean(currentUser && currentUser.role === "guest");
  els.loginScreen.classList.toggle("hidden", signedIn);
  els.appShell.classList.toggle("hidden", !signedIn);

  if (!signedIn) return;

  els.accountName.textContent = currentUser.name;
  els.accountPhone.textContent = currentUser.mobile ? currentUser.mobile : "";
  // Restore last search dates for this guest if available, otherwise set sensible defaults
  try {
    const saved = state.lastSearchByUser && currentUser && state.lastSearchByUser[currentUser.id];
    if (saved && saved.checkIn && saved.checkOut) {
      els.checkIn.value = saved.checkIn;
      els.checkOut.value = saved.checkOut;
    } else {
      setDefaultDates();
    }
  } catch (e) {
    setDefaultDates();
  }

  // Immediately render availability for the restored dates so the guest sees results on login
  renderRooms();
  renderAll();
}

function renderRooms() {
  const checkIn = els.checkIn.value;
  const checkOut = els.checkOut.value;
  const nights = HotelPortal.nightsBetween(checkIn, checkOut) || 1;

  els.roomGrid.innerHTML = state.rooms.map((room) => {
    const available = HotelPortal.isRoomAvailable(state, room.id, checkIn, checkOut);
    const total = room.price * nights;
    return `
      <article class="room-card ${available ? "" : "unavailable"}">
        <div class="room-photo" style="--photo: url('${room.photo}')"></div>
        <div class="room-body">
          <div class="room-title">
            <div>
              <h3>${room.type}</h3>
              <span class="muted">Room ${room.number}</span>
            </div>
            <span class="price">${HotelPortal.money(room.price)}</span>
          </div>
          <ul class="amenities">
            ${room.amenities.map((amenity) => `<li>${amenity}</li>`).join("")}
          </ul>
          <button class="primary-button" type="button" data-book-room="${room.id}" ${available ? "" : "disabled"}>
            ${available ? `Book ${nights} night${nights === 1 ? "" : "s"} - ${HotelPortal.money(total)}` : "Unavailable for dates"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderMenu() {
  const menuItems = Array.isArray(state.menu) ? state.menu : [];
  const availableCount = menuItems.filter((item) => item.available).length;
  const unavailableCount = menuItems.length - availableCount;

  if (els.menuStatus) {
    if (!menuItems.length) {
      els.menuStatus.textContent = "No food items are configured yet.";
    } else {
      els.menuStatus.textContent = `${availableCount} available, ${unavailableCount} unavailable`;
    }
  }

  if (!menuItems.length) {
    els.menuGrid.innerHTML = `<div class="empty-state">No menu items are available right now.</div>`;
    return;
  }

  els.menuGrid.innerHTML = menuItems.map((item) => `
    <article class="menu-card">
      <div>
        <h3>${item.name}</h3>
        <p>${item.description}</p>
      </div>
      <div class="menu-meta">
        <span>${HotelPortal.money(item.price)}</span>
        <span class="status">${item.available ? "Available" : "Unavailable"}</span>
      </div>
      <button class="primary-button" type="button" data-menu-order="${item.id}" ${item.available ? "" : "disabled"}>
        ${item.available ? "Order from room service" : "Not available"}
      </button>
    </article>
  `).join("");
}

function renderGuestBookings() {
  const bookings = getGuestBookings();
  if (!bookings.length) {
    els.myBookings.innerHTML = `<div class="empty-state">No bookings yet. Choose dates and reserve a room to start your guest dashboard.</div>`;
  } else {
    els.myBookings.innerHTML = bookings.map((booking) => {
      const room = getRoom(booking.roomId);
      return `
        <article class="list-item">
          <div class="list-line">
            <div>
              <strong>${booking.guest}</strong>
              <span class="muted">Room ${room.number} - ${room.type}</span>
            </div>
            <span class="status">${booking.status}</span>
          </div>
          <span>${HotelPortal.formatDate(booking.checkIn)} to ${HotelPortal.formatDate(booking.checkOut)}</span>
        </article>
      `;
    }).join("");
  }

  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  if (!confirmedBookings.length) {
    els.requestBooking.innerHTML = `<option value="" disabled selected>No confirmed bookings</option>`;
    return;
  }

  els.requestBooking.innerHTML = [`
    <option value="" disabled selected>Select booking</option>
    ${confirmedBookings.map((booking) => {
      const room = getRoom(booking.roomId);
      return `<option value="${booking.id}">Room ${room.number} - ${HotelPortal.formatDate(booking.checkIn)}</option>`;
    }).join("")}
  `].join("");
}

function renderGuestRequests() {
  const bookings = getGuestBookings();
  const bookingIds = new Set(bookings.map((booking) => booking.id));
  const requests = state.requests.filter((request) => bookingIds.has(request.bookingId));

  els.myRequests.innerHTML = requests.length ? requests.map((request) => {
    const booking = bookings.find((bookingItem) => bookingItem.id === request.bookingId);
    const room = booking ? getRoom(booking.roomId) : null;
    return `
      <article class="list-item">
        <div class="list-line">
          <div>
            <strong>${request.type === "food_order" ? "Room order" : HotelPortal.requestLabel(request.type)}</strong>
            <span class="muted">${booking ? `Room ${room.number} - ${HotelPortal.formatDate(booking.checkIn)}` : "Booking removed"}</span>
          </div>
          <span class="status ${request.status}">${request.status.replace("_", " ")}</span>
        </div>
        <span>${request.description}</span>
        ${request.status === "new" ? `<div class="status-actions"><button class="status-button" type="button" data-request-cancel="${request.id}">Cancel request</button></div>` : ""}
      </article>
    `;
  }).join("") : `<div class="empty-state">No requests placed yet.</div>`;
}

function renderMetrics() {
  const bookings = getGuestBookings().filter((booking) => booking.status === "confirmed");
  const bookingIds = new Set(bookings.map((booking) => booking.id));
  const openRequests = state.requests.filter((request) => request.status !== "completed" && bookingIds.has(request.bookingId));
  els.activeBookingsCount.textContent = bookings.length;
  els.openRequestsCount.textContent = openRequests.length;
}

async function refreshGuestMenu() {
  if (!USE_BACKEND) return;
  try {
    const payload = await api("/api/menu");
    state.menu = Array.isArray(payload.menu) ? payload.menu : [];
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshGuestData() {
  if (!USE_BACKEND || !currentUser) return;

  try {
    const [bookingsPayload, requestsPayload] = await Promise.all([
      api("/api/bookings/my"),
      api("/api/requests/my")
    ]);
    state.bookings = Array.isArray(bookingsPayload.bookings) ? bookingsPayload.bookings : state.bookings;
    state.requests = Array.isArray(requestsPayload.requests) ? requestsPayload.requests : state.requests;
  } catch (error) {
    showToast(error.message);
  }
}

function startLiveMenuRefresh() {
  if (USE_BACKEND) {
    if (menuRefreshIntervalId) {
      window.clearInterval(menuRefreshIntervalId);
    }

    menuRefreshIntervalId = window.setInterval(async () => {
      try {
        const payload = await api("/api/menu");
        const menu = Array.isArray(payload.menu) ? payload.menu : [];
        const current = JSON.stringify(state.menu || []);
        const next = JSON.stringify(menu);
        if (current !== next) {
          state.menu = menu;
          renderMenu();
        }
      } catch {
        // ignore polling failures
      }
    }, MENU_REFRESH_INTERVAL);

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refreshGuestMenu().then(renderMenu).catch(() => {});
      }
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== "hotel-portal-state-v2" && event.key !== "hotel-portal-state-v1") return;
    const updatedState = HotelPortal.loadState();
    const current = JSON.stringify(state.menu || []);
    const next = JSON.stringify(updatedState.menu || []);
    if (current === next) return;

    state = updatedState;
    currentUser = HotelPortal.getSessionUser(state);
    renderMenu();
  });
}

async function renderAll() {
  await refreshGuestMenu();
  await refreshGuestData();
  renderRooms();
  renderMenu();
  renderGuestBookings();
  renderGuestRequests();
  renderMetrics();
}

function bookRoom(roomId) {
  const checkIn = els.checkIn.value;
  const checkOut = els.checkOut.value;

  if (!checkIn || !checkOut || HotelPortal.nightsBetween(checkIn, checkOut) <= 0) {
    showToast("Choose a valid check-in and check-out range.");
    return;
  }

  if (!HotelPortal.isRoomAvailable(state, Number(roomId), checkIn, checkOut)) {
    showToast("That room is already booked for these dates.");
    renderRooms();
    return;
  }

  state.bookings.unshift({
    id: Date.now(),
    userId: currentUser.id,
    guest: currentUser.name,
    roomId: Number(roomId),
    checkIn,
    checkOut,
    status: "confirmed"
  });

  HotelPortal.saveState(state);
  renderAll();
  showToast("Booking confirmed and added to your dashboard.");
}

els.loginModeButton.addEventListener("click", () => setAuthMode("login"));
els.registerModeButton.addEventListener("click", () => setAuthMode("register"));

els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = els.loginUsername.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  const user = state.users.find((item) => item.role === "guest" && item.username.toLowerCase() === username && item.password === password);

  if (!user) {
    showToast("Invalid guest username or password.");
    return;
  }

  setSession(user);
  showToast(`Welcome back, ${user.name}.`);
});

els.registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.registerName.value.trim();
  const mobile = els.registerMobile.value.trim();
  const username = els.registerUsername.value.trim();
  const password = els.registerPassword.value;

  if (state.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    showToast("That username is already taken.");
    return;
  }

  const user = { id: Date.now(), name, mobile, username, password, role: "guest" };
  state.users.push(user);
  HotelPortal.saveState(state);
  setSession(user);
  els.registerForm.reset();
  showToast("Guest account created.");
});

els.guestDemoLogin.addEventListener("click", () => {
  const user = state.users.find((item) => item.username === "guest" && item.role === "guest");
  if (user) setSession(user);
});

els.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderRooms();
  // persist the last search for the signed-in guest so it survives logout
  try {
    if (currentUser && currentUser.id) {
      state.lastSearchByUser = state.lastSearchByUser || {};
      state.lastSearchByUser[currentUser.id] = { checkIn: els.checkIn.value, checkOut: els.checkOut.value };
      HotelPortal.saveState(state);
    }
  } catch (e) {
    // ignore persistence failures
  }
  showToast("Availability refreshed for the selected dates.");
});

els.roomGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-book-room]");
  if (button) bookRoom(button.dataset.bookRoom);
});

els.myRequests.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-request-cancel]");
  if (!button) return;

  const requestId = Number(button.dataset.requestCancel);
  const request = state.requests.find((item) => item.id === requestId);
  if (!request) return;

  if (USE_BACKEND) {
    try {
      await api(`/api/requests/${requestId}`, { method: "DELETE" });
    } catch (error) {
      showToast(error.message);
      return;
    }
  } else {
    state.requests = state.requests.filter((item) => item.id !== requestId);
    HotelPortal.saveState(state);
  }

  renderAll();
  showToast("Request canceled.");
});

els.menuGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-menu-order]");
  if (!button) return;

  const itemId = Number(button.dataset.menuOrder);
  const item = (state.menu || []).find((menuItem) => menuItem.id === itemId);
  if (!item) {
    showToast("Menu item not found.");
    return;
  }

  if (!currentUser || currentUser.role !== "guest") {
    showToast("Please sign in as a guest to order food.");
    return;
  }

  const booking = getGuestBookings().find((bookingItem) => bookingItem.status === "confirmed");
  if (!booking) {
    showToast("You need a confirmed booking before ordering food.");
    return;
  }

  state.requests.unshift({
    id: Date.now(),
    bookingId: booking.id,
    type: "food_order",
    description: `Room service order: ${item.name}`,
    status: "new",
    createdAt: new Date().toISOString()
  });

  HotelPortal.saveState(state);
  renderAll();
  showToast(`Ordered ${item.name}. Admin will receive the request.`);
});

els.requestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!els.requestBooking.value) {
    showToast("Create a booking before sending a service request.");
    return;
  }

  state.requests.unshift({
    id: Date.now(),
    bookingId: Number(els.requestBooking.value),
    type: els.requestType.value,
    description: els.requestDescription.value.trim(),
    status: "new",
    createdAt: new Date().toISOString()
  });

  els.requestDescription.value = "";
  HotelPortal.saveState(state);
  renderAll();
  showToast("Request sent to the admin board.");
});

els.seedDemo.addEventListener("click", () => {
  state = HotelPortal.resetState();
  currentUser = HotelPortal.getSessionUser(state);
  renderShell();
  showToast("Demo data reset.");
});

els.logoutButton.addEventListener("click", () => {
  HotelPortal.clearSession();
  currentUser = null;
  renderShell();
  showToast("Signed out.");
});

HotelPortal.saveState(state);
setDefaultDates();
startLiveMenuRefresh();
renderShell();
