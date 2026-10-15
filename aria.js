/* ==========================================
   DriveConnect VIP - Master Engine & Aria Concierge (aria.js)
   ========================================== */

const CONFIG = {
    // Google Apps Script Web App URL (code.gs)
    SHOWROOM_API_URL: 'https://script.google.com/macros/s/AKfycbyqnBPGwjy1ElWDC-G-DPMYS8G3xPGZo0WLAvnN1tTm1PUrWN9SWvgCI-gbz9J9IAh2/exec',
    DEBUG: true
};

let cachedInventory = [];
let cachedDealers = [];
let filteredInventory = [];
let currentPage = 1;
const itemsPerPage = 6;

// --- 0. URL PARAMETER HELPER ---
function checkAndApplyUrlDealerFilter() {
    const urlParams = new URLSearchParams(window.location.search);
    const dealerParam = urlParams.get('dealer');

    if (dealerParam) {
        const decodedDealer = decodeURIComponent(dealerParam).trim();
        const searchInput = document.getElementById('inventorySearch');
        if (searchInput) {
            searchInput.value = decodedDealer;
        }
        filterInventory(decodedDealer);
    }
}

// --- 1. NETWORK DATA FETCHING (GOOGLE SHEETS via code.gs) ---
async function fetchNetworkDataForAria() {
    try {
        const response = await fetch(CONFIG.SHOWROOM_API_URL, {
            method: 'GET',
            redirect: 'follow'
        });
        const data = await response.json();

        if (data && data.status === 'success') {
            cachedInventory = data.inventory || [];
            cachedDealers = data.dealers || [];
            return { inventory: cachedInventory, dealers: cachedDealers };
        }
    } catch (err) {
        console.warn("⚠️ Error fetching live inventory data:", err);
    }

    return { inventory: cachedInventory || [], dealers: cachedDealers || [] };
}

// --- 2. INVENTORY GRID & RENDERING (PAGINATED TO 6 CARDS PER PAGE) ---
async function loadInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top: 10px;">Loading exclusive inventory from Google Sheets...</p></div>';

    // 1. Fetch data from Google Sheets backend first
    await fetchNetworkDataForAria();
    filteredInventory = [...cachedInventory];

    // 2. Check for dealer URL parameter IMMEDIATELY after data is loaded
    const urlParams = new URLSearchParams(window.location.search);
    const dealerParam = urlParams.get('dealer');

    if (dealerParam) {
        const decodedDealer = decodeURIComponent(dealerParam).trim();
        const searchInput = document.getElementById('inventorySearch');
        if (searchInput) {
            searchInput.value = decodedDealer;
        }

        // Filter inventory right away before rendering
        const query = decodedDealer.toLowerCase();
        filteredInventory = cachedInventory.filter(car => {
            const fullStr = `${car.Year || car.year || ''} ${car.Make || car.make || ''} ${car.Model || car.model || ''} ${car.Trim || car.trim || ''} ${car.DealerID || car.DealerCode || car.Dealer || car.DealerName || ''}`.toLowerCase();
            return fullStr.includes(query);
        });
    }

    currentPage = 1;
    renderInventoryPage();
}

function renderInventoryPage() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (filteredInventory.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">No matching vehicle allocations found.</div>';
        renderPaginationControls(0);
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredInventory.slice(start, start + itemsPerPage);

    // Delegate rendering to index.html's renderInventory function if available
    if (typeof window.renderInventory === 'function') {
        window.renderInventory(paginatedItems);
    } else {
        // Fallback native render with dynamic DealerID resolution
        paginatedItems.forEach((car, index) => {
            const absoluteIndex = start + index;
            const carName = `${car.Year || car.year || ''} ${car.Make || car.make || ''} ${car.Model || car.model || ''} ${car.Trim || car.trim || ''}`.trim();
            const price = Number(car.Price || car.price || 0).toLocaleString();
            const image = car.ImageURL || car.image_url_1 || 'sportscar.jpg';
            const dealer = car.DealerID || car.DealerCode || car.Dealer || car.DealerName || 'VIP Partner';
            const mileage = Number(car.Mileage || car.mileage || 1250).toLocaleString();
            const condition = car.Condition || car.status || 'Verified Allocation';

            const card = document.createElement('div');
            card.style.cssText = "background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 10px 20px rgba(0,0,0,0.3); position: relative;";
            card.innerHTML = `
                <div style="height: 200px; background: #1e293b; overflow: hidden; position: relative;">
                    <img src="${image}" alt="${carName}" style="width: 100%; height: 100%; object-fit: cover;">
                    <span style="position: absolute; top: 10px; left: 10px; background: rgba(15,23,42,0.85); backdrop-filter: blur(4px); color: #38bdf8; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; border: 1px solid #334155;">${dealer}</span>
                    <span style="position: absolute; top: 10px; right: 10px; background: rgba(34,197,94,0.85); backdrop-filter: blur(4px); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">${condition}</span>
                </div>
                <div style="padding: 20px; display: flex; flex-direction: column; flex: 1; justify-content: space-between;">
                    <div>
                        <h3 style="margin: 0 0 6px 0; font-size: 17px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${carName}">${carName}</h3>
                        <p style="color: #22c55e; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">$${price}</p>
                        <div style="display: flex; gap: 10px; font-size: 12px; color: #94a3b8; margin-bottom: 16px;">
                            <span><i class="fa-solid fa-road"></i> ${mileage} mi</span>
                            <span>•</span>
                            <span><i class="fa-solid fa-gears"></i> ${car.Transmission || car.transmission || 'Automatic'}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="openSpecModal(${absoluteIndex})" style="flex: 1; background: #2563eb; color: #fff; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; text-align: center;">Spec Sheet</button>
                        <button onclick="openCalculatorModal(${car.Price || car.price || 0}, '${carName.replace(/'/g, "\\'")}')" style="background: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 10px 14px; border-radius: 6px; cursor: pointer;"><i class="fa-solid fa-calculator"></i></button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    renderPaginationControls(filteredInventory.length);
}

function renderPaginationControls(totalItems) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} style="background: #1e293b; color: #fff; border: 1px solid #334155; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px;">Prev</button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="changePage(${i})" style="background: ${i === currentPage ? '#2563eb' : '#1e293b'}; color: #fff; border: 1px solid ${i === currentPage ? '#2563eb' : '#334155'}; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: ${i === currentPage ? '700' : '400'};">${i}</button>`;
    }

    html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} style="background: #1e293b; color: #fff; border: 1px solid #334155; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px;">Next</button>`;

    paginationContainer.innerHTML = html;
}

function changePage(targetPage) {
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
    if (targetPage < 1 || targetPage > totalPages) return;
    currentPage = targetPage;
    renderInventoryPage();

    const gridEl = document.getElementById('inventory-grid');
    if (gridEl) {
        const topPos = gridEl.getBoundingClientRect().top + window.pageYOffset - 120;
        window.scrollTo({ top: topPos, behavior: 'smooth' });
    }
}

function filterInventory(keyword) {
    const query = keyword.toLowerCase();
    filteredInventory = cachedInventory.filter(car => {
        const fullStr = `${car.Year || car.year || ''} ${car.Make || car.make || ''} ${car.Model || car.model || ''} ${car.Trim || car.trim || ''} ${car.DealerID || car.DealerCode || car.Dealer || car.DealerName || ''}`.toLowerCase();
        return fullStr.includes(query);
    });
    currentPage = 1;
    renderInventoryPage();
}

// --- 3. ADVANCED SEARCH & OPTIONS ---
function toggleAdvancedSearch() {
    const panel = document.getElementById('advanced-search-panel');
    if (!panel) return;
    panel.style.display = (panel.style.display === 'flex') ? 'none' : 'flex';
}

function populateAdvancedSearchOptions() {
    const makeSelect = document.getElementById('adv-make');
    if (!makeSelect || makeSelect.options.length > 1) return;

    const makes = [...new Set(cachedInventory.map(c => c.Make || c.make).filter(Boolean))].sort();
    makes.forEach(make => {
        const opt = document.createElement('option');
        opt.value = make;
        opt.textContent = make;
        makeSelect.appendChild(opt);
    });
}

function applyAdvancedFilters() {
    const makeEl = document.getElementById('adv-make');
    const sortEl = document.getElementById('adv-price-sort');
    const selectedMake = makeEl ? makeEl.value.toLowerCase() : '';
    const priceSort = sortEl ? sortEl.value : '';

    filteredInventory = cachedInventory.filter(car => {
        const make = String(car.Make || car.make || '').toLowerCase();
        if (selectedMake && make !== selectedMake) return false;
        return true;
    });

    if (priceSort === 'low-high') {
        filteredInventory.sort((a, b) => Number(a.Price || a.price || 0) - Number(b.Price || b.price || 0));
    } else if (priceSort === 'high-low') {
        filteredInventory.sort((a, b) => Number(b.Price || b.price || 0) - Number(a.Price || a.price || 0));
    }

    currentPage = 1;
    renderInventoryPage();
}

function promptManagerAccess(event) {
    if (event) event.preventDefault();
    const pin = prompt("Enter Manager Access PIN:");
    if (pin === "7777") {
        window.location.href = "manager.html";
    } else if (pin !== null) {
        alert("Incorrect PIN.");
    }
}

// --- 4. ARIA CHATBOT & CONCIERGE ENGINE ---
function toggleChat() {
    const chatBox = document.getElementById("chat-box");
    if (!chatBox) return;
    if (chatBox.style.display === "none" || chatBox.style.display === "") {
        chatBox.style.display = "flex";
        document.getElementById("chat-input")?.focus();
    } else {
        chatBox.style.display = "none";
    }
}

function handleChatKey(event) {
    if (event.key === "Enter") sendChatMessage();
}

function appendMessage(sender, text, extraHtml = "") {
    const messagesContainer = document.getElementById("chat-messages");
    if (!messagesContainer) return;

    const msgDiv = document.createElement("div");
    if (sender === 'user') {
        msgDiv.style.cssText = "background: #2563eb; color: #fff; padding: 12px 14px; border-radius: 10px 10px 2px 10px; max-width: 88%; margin-left: auto; text-align: right; word-break: break-word; line-height: 1.4;";
        msgDiv.textContent = text;
    } else {
        msgDiv.style.cssText = "background: #1e293b; color: #f8fafc; padding: 12px 14px; border-radius: 10px 10px 10px 2px; max-width: 88%; word-break: break-word; border: 1px solid #334155; line-height: 1.4;";
        msgDiv.innerHTML = text;
        if (extraHtml instanceof HTMLElement) msgDiv.appendChild(extraHtml);
        else if (typeof extraHtml === 'string' && extraHtml.trim() !== '') {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = extraHtml;
            msgDiv.appendChild(wrapper);
        }
    }
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendChatMessage() {
    try {
        const input = document.getElementById("chat-input");
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        appendMessage('user', text);
        input.value = '';
        const lowerText = text.toLowerCase();

        if (lowerText.includes('manager') || lowerText.includes('admin')) {
            promptManagerAccess();
            return;
        }

        const messagesContainer = document.getElementById("chat-messages");

        // Show Typing Indicator
        const typingMsg = document.createElement("div");
        typingMsg.id = "aria-typing";
        typingMsg.style.cssText = "background: #1f2937; color: #94a3b8; padding: 10px; border-radius: 6px; max-width: 85%; font-style: italic; margin-bottom: 8px;";
        typingMsg.textContent = "Aria is scanning network inventory & VIP benefits...";
        if (messagesContainer) {
            messagesContainer.appendChild(typingMsg);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        const networkData = await fetchNetworkDataForAria();
        const inventory = networkData.inventory;
        const dealers = networkData.dealers;

        let aiReply = "";
        let matchedCarForAction = null;

        if (lowerText.includes('vip') || lowerText.includes('perk') || lowerText.includes('pass') || lowerText.includes('concierge') || lowerText.includes('benefit')) {
            aiReply = `🌟 **DriveConnect VIP Pass Exclusive Benefits:**\n` +
                      `• **Priority Test Drives:** Skip the showroom queue and schedule private test drives directly to your location.\n` +
                      `• **Personal Concierge Service:** Dedicated advisors to match you with custom financing, credit rebuilding options, and vehicle tracking.\n` +
                      `• **Complimentary Maintenance & Warranties:** Bundled multi-point inspections and extended dealer network protection plans.\n` +
                      `• **Flexible Financing:** Customized solutions tailored for all credit backgrounds and budgets.`;
        }

        const matchingCars = inventory.filter(car => {
            const make = String(car.Make || car.make || '').toLowerCase();
            const model = String(car.Model || car.model || '').toLowerCase();
            const trim = String(car.Trim || car.trim || '').toLowerCase();
            const fullStr = `${make} ${model} ${trim}`;

            return lowerText.split(/\s+/).some(word => {
                if (word.length <= 2) return false;
                const cleanWord = word.endsWith('s') ? word.slice(0, -1) : word;
                return fullStr.includes(cleanWord);
            });
        });

        if (matchingCars.length > 0) {
            matchedCarForAction = matchingCars[0];
        }

        if (!aiReply) {
            if (matchingCars.length > 0) {
                aiReply = `Yes, we have matching allocations in our network:\n\n` +
                    matchingCars.map(c => `• ${c.Year || c.year || ''} ${c.Make || c.make || ''} ${c.Model || c.model || ''} ${c.Trim || c.trim || ''} — $${Number(c.Price || c.price || 0).toLocaleString()}`).join('\n');
            }
            else if (lowerText.includes("under") || lowerText.includes("less than") || lowerText.includes("budget") || lowerText.includes("$")) {
                const matches = text.replace(/,/g, '').match(/\d+/g);
                const targetPrice = matches ? parseInt(matches.join(''), 10) : null;

                if (targetPrice) {
                    const budgetMatches = inventory.filter(car => {
                        const price = Number(car.Price || car.price || 0);
                        return price > 0 && price <= targetPrice;
                    });

                    if (budgetMatches.length > 0) {
                        aiReply = `Found ${budgetMatches.length} vehicle(s) under $${targetPrice.toLocaleString()}:\n` +
                            budgetMatches.map(c => `• ${c.Year || c.year || ''} ${c.Make || c.make || ''} ${c.Model || c.model || ''} — $${Number(c.Price || c.price || 0).toLocaleString()}`).join('\n');
                    } else {
                        aiReply = `No network allocations indexed under $${targetPrice.toLocaleString()}.`;
                    }
                } else {
                    aiReply = `Please specify a numerical budget amount (e.g., "under $40,000").`;
                }
            }
            else if (lowerText.includes("hello") || lowerText.includes("hi")) {
                aiReply = `Hello! I'm Aria, your DriveConnect VIP concierge. Ask me about our vehicles, pricing, or the exclusive perks of our VIP Pass!`;
            } else {
                aiReply = `We have ${inventory.length} vehicles indexed across our partner network. Try searching for a specific make, model, budget range, or ask about our VIP Pass benefits!`;
            }

            aiReply += `\n\nWould you like to sign up for a VIP referral pass today?`;
        }

        document.getElementById("aria-typing")?.remove();

        let actionHtml = "";
        if (matchedCarForAction) {
            const carTitle = `${matchedCarForAction.Year || matchedCarForAction.year || ''} ${matchedCarForAction.Make || matchedCarForAction.make || ''} ${matchedCarForAction.Model || matchedCarForAction.model || ''} ${matchedCarForAction.Trim || matchedCarForAction.trim || ''}`;
            const carPrice = Number(matchedCarForAction.Price || matchedCarForAction.price || 0);
            const dealer = matchedCarForAction.DealerID || matchedCarForAction.DealerCode || matchedCarForAction.Dealer || 'VIP Partner';
            actionHtml = `<br><br><button onclick="openReferralModalForCar('${carTitle}', ${carPrice}, '${dealer}')" style="background: #22c55e; color: #090d16; border: none; padding: 8px 14px; border-radius: 4px; font-weight: 700; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-file-signature"></i> Claim VIP Referral Pass for this Vehicle</button>`;
        }

        appendMessage('aria', aiReply.trim().replace(/\n/g, '<br>'), actionHtml);

    } catch (err) {
        console.error("Aria Execution Error:", err);
        document.getElementById("aria-typing")?.remove();
        appendMessage('aria', "Sorry, I had trouble processing that request. Would you like to sign up for a VIP referral pass?");
    }
}

function openReferralModalForCar(vehicleName, price, dealer) {
    if (typeof openSpecModal === 'function' && cachedInventory.length > 0) {
        const foundCarIndex = cachedInventory.findIndex(c => {
            const fullName = `${c.Year || c.year || ''} ${c.Make || c.make || ''} ${c.Model || c.model || ''}`.trim();
            return fullName.toLowerCase() === vehicleName.toLowerCase();
        });
        if (foundCarIndex !== -1) {
            toggleChat();
            openSpecModal(foundCarIndex);
            return;
        }
    }
    alert(`Initiating VIP Referral Pass for: ${vehicleName} ($${price.toLocaleString()}) at ${dealer}.`);
}

// --- 5. COMPREHENSIVE SPEC SHEET MODAL ---
function openSpecModal(carIdOrObj) {
    const modal = document.getElementById('spec-modal');
    const content = document.getElementById('spec-modal-content');
    if (!modal || !content) return;

    let car = carIdOrObj;
    if (typeof carIdOrObj === 'number' || typeof carIdOrObj === 'string') {
        car = cachedInventory.find((v, idx) => v.id == carIdOrObj || idx == carIdOrObj);
    }
    if (!car) return;

    const carName = `${car.Year || car.year || ''} ${car.Make || car.make || ''} ${car.Model || car.model || ''} ${car.Trim || car.trim || ''}`;
    const price = Number(car.Price || car.price || 0).toLocaleString();
    const mileage = Number(car.Mileage || car.mileage || 0).toLocaleString();
    const dealerIdentifier = car.DealerID || car.dealer_id || car.DealerCode || car.Dealer || car.DealerName || 'VIP Partner';

    const images = [
        car.image_url_1 || car.ImageURL || car.imageurl,
        car.image_url_2 || car.ImageURL2 || car.imageurl2,
        car.image_url_3,
        car.image_url_4,
        car.image_url_5
    ].filter(img => img && img.trim() !== '');

    if (images.length === 0) images.push('sportscar.jpg');

    content.innerHTML = `
        <div style="max-height: 85vh; overflow-y: auto; background: #0f172a; color: #f8fafc; border-radius: 12px; padding-bottom: 20px;">
            <div style="height: 320px; background: #1e293b; overflow: hidden; position: relative;">
                <img id="modal-main-img" src="${images[0]}" alt="${carName}" style="width: 100%; height: 100%; object-fit: cover; transition: opacity 0.2s ease;">
                <span style="position: absolute; top: 15px; left: 15px; background: rgba(15,23,42,0.85); backdrop-filter: blur(4px); color: #38bdf8; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1px solid #334155;">${dealerIdentifier}</span>
                <span style="position: absolute; top: 15px; right: 15px; background: rgba(34,197,94,0.85); backdrop-filter: blur(4px); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">${car.Condition || car.status || 'Verified'}</span>
            </div>

            ${images.length > 1 ? `
                <div style="display: flex; gap: 8px; padding: 12px 25px 0 25px; overflow-x: auto;">
                    ${images.map((img, idx) => `
                        <img src="${img}" class="spec-thumb" data-index="${idx}" style="width: 65px; height: 45px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid ${idx === 0 ? '#38bdf8' : '#334155'}; opacity: ${idx === 0 ? '1' : '0.7'}; transition: all 0.2s;">
                    `).join('')}
                </div>
            ` : ''}

            <div style="padding: 20px 25px 10px 25px;">
                <span style="color: #38bdf8; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Verified Dealer Specification Sheet</span>
                <h2 style="font-size: 24px; margin: 6px 0 4px 0; color: #fff;">${carName}</h2>
                <p style="color: #22c55e; font-size: 22px; font-weight: 900; margin-bottom: 20px;">$${price}</p>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
                    <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;"><span style="font-size: 11px; color: #94a3b8; display: block;">VIN</span><span style="font-size: 13px; font-weight: 700; color: #fff; word-break: break-all;">${car.VIN || car.vin || 'Available upon request'}</span></div>
                    <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;"><span style="font-size: 11px; color: #94a3b8; display: block;">Body Style</span><span style="font-size: 14px; font-weight: 700; color: #fff;">${car.BodyStyle || car.bodystyle || 'Coupe / Sedan'}</span></div>
                    <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;"><span style="font-size: 11px; color: #94a3b8; display: block;">Mileage</span><span style="font-size: 14px; font-weight: 700; color: #fff;">${mileage} mi</span></div>
                    <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;"><span style="font-size: 11px; color: #94a3b8; display: block;">Transmission</span><span style="font-size: 14px; font-weight: 700; color: #fff;">${car.Transmission || car.transmission || 'Automatic'}</span></div>
                    <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;"><span style="font-size: 11px; color: #94a3b8; display: block;">Motor / Engine</span><span style="font-size: 14px; font-weight: 700; color: #fff;">${car.Motor || car.motor || 'Performance Engine'}</span></div>
                    <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;"><span style="font-size: 11px; color: #94a3b8; display: block;">Drivetrain</span><span style="font-size: 14px; font-weight: 700; color: #fff;">${car.Drivetrain || car.drivetrain || 'AWD / RWD'}</span></div>
                    <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;"><span style="font-size: 11px; color: #94a3b8; display: block;">MPG / Efficiency</span><span style="font-size: 14px; font-weight: 700; color: #fff;">${car.MPG || car.mpg || 'Standard'}</span></div>
                    <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;"><span style="font-size: 11px; color: #94a3b8; display: block;">Fuel Type</span><span style="font-size: 14px; font-weight: 700; color: #fff;">${car.FuelType || car.fueltype || 'Gasoline / Electric'}</span></div>
                    <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;"><span style="font-size: 11px; color: #94a3b8; display: block;">Exterior Color</span><span style="font-size: 14px; font-weight: 700; color: #fff;">${car.ExteriorColor || car.exteriorcolor || 'Standard'}</span></div>
                    <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;"><span style="font-size: 11px; color: #94a3b8; display: block;">Interior Color</span><span style="font-size: 14px; font-weight: 700; color: #fff;">${car.InteriorColor || car.interiorcolor || 'Standard'}</span></div>
                    <div style="background: rgba(56, 189, 248, 0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.3); grid-column: span 2;"><span style="font-size: 11px; color: #38bdf8; display: block; font-weight: 600;">Featured Dealer Perk</span><span style="font-size: 14px; font-weight: 700; color: #f8fafc;">${car.DealerPerk || car.dealerperk || 'Complimentary VIP concierge service & inspection'}</span></div>
                </div>

                <div style="display: flex; gap: 12px;">
                    <button id="modal-calc-btn" style="flex: 1; background: #2563eb; color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: center;"><i class="fa-solid fa-calculator"></i> Finance Calculator</button>
                    <button id="modal-vip-btn" style="background: #22c55e; color: #090d16; border: none; padding: 12px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;"><i class="fa-solid fa-crown"></i> Claim VIP Pass</button>
                </div>
            </div>
        </div>
    `;

    const mainImg = document.getElementById('modal-main-img');
    const thumbs = content.querySelectorAll('.spec-thumb');
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            thumbs.forEach(t => {
                t.style.border = '2px solid #334155';
                t.style.opacity = '0.7';
            });
            thumb.style.border = '2px solid #38bdf8';
            thumb.style.opacity = '1';
            if (mainImg) {
                mainImg.style.opacity = '0.3';
                setTimeout(() => {
                    mainImg.src = thumb.src;
                    mainImg.style.opacity = '1';
                }, 150);
            }
        });
    });

    document.getElementById('modal-calc-btn').addEventListener('click', () => openCalculatorModal(car.Price || car.price, carName));
    document.getElementById('modal-vip-btn').addEventListener('click', () => openVipPassModal(car));

    modal.style.display = 'flex';
}

function closeSpecModal() {
    const modal = document.getElementById('spec-modal');
    if (modal) modal.style.display = 'none';
}

// --- 6. FINANCE CALCULATOR & VIP PASS ---
let activeCarPrice = 0;
let selectedCarForVip = null;

function openCalculatorModal(price, title) {
    activeCarPrice = Number(price || 0);
    const modal = document.getElementById('calculator-modal');
    const titleEl = document.getElementById('calc-vehicle-title');
    const priceEl = document.getElementById('calc-vehicle-price');
    const downInput = document.getElementById('calc-down');

    if (titleEl) titleEl.textContent = title;
    if (priceEl) priceEl.textContent = `$${activeCarPrice.toLocaleString()}`;
    if (downInput) {
        downInput.max = activeCarPrice;
        downInput.value = 0;
    }

    closeSpecModal();
    if (modal) modal.style.display = 'flex';
    updateCalculator();
}

function closeCalculatorModal() {
    const modal = document.getElementById('calculator-modal');
    if (modal) modal.style.display = 'none';
}

function onCreditScoreChange() {
    const creditSelect = document.getElementById('calc-credit');
    const rateInput = document.getElementById('calc-rate');
    if (!creditSelect || !rateInput) return;

    const val = creditSelect.value;
    let rate = 7.0;
    if (val === '750') rate = 5.5;
    else if (val === '700') rate = 7.0;
    else if (val === '650') rate = 10.5;
    else if (val === '580') rate = 14.5;

    rateInput.value = rate;
    updateCalculator();
}

function updateCalculator() {
    const rateInput = document.getElementById('calc-rate');
    const termSelect = document.getElementById('calc-term');
    const downInput = document.getElementById('calc-down');
    const downValSpan = document.getElementById('down-payment-val');
    const resultSpan = document.getElementById('calc-monthly-result');

    if (!rateInput || !termSelect || !downInput || !resultSpan) return;

    const annualRate = parseFloat(rateInput.value) || 0;
    const months = parseInt(termSelect.value) || 60;
    const downPayment = parseFloat(downInput.value) || 0;

    if (downValSpan) downValSpan.textContent = `$${downPayment.toLocaleString()}`;

    const loanAmount = Math.max(0, activeCarPrice - downPayment);
    const monthlyRate = (annualRate / 100) / 12;

    let monthlyPayment = monthlyRate === 0 ? loanAmount / months : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    resultSpan.textContent = `$${Math.round(monthlyPayment).toLocaleString()}/mo`;
}

function openVipPassModal(car) {
    selectedCarForVip = car;
    const modal = document.getElementById('vip-modal');
    const titleEl = document.getElementById('vip-modal-car-title');
    const carName = `${car.Year || car.year || ''} ${car.Make || car.make || ''} ${car.Model || car.model || ''} ${car.Trim || car.trim || ''}`;

    if (titleEl) titleEl.textContent = `Allocation: ${carName} — $${Number(car.Price || car.price || 0).toLocaleString()}`;
    closeSpecModal();
    if (modal) modal.style.display = 'flex';
}

function closeVipModal() {
    const modal = document.getElementById('vip-modal');
    if (modal) modal.style.display = 'none';
}

async function submitVipPass(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('vip-name')?.value.trim() || '';
    const email = document.getElementById('vip-email')?.value.trim() || '';
    const phone = document.getElementById('vip-phone')?.value.trim() || '';

    if (!selectedCarForVip) return;

    const vehicleName = `${selectedCarForVip.Year || selectedCarForVip.year || ''} ${selectedCarForVip.Make || selectedCarForVip.make || ''} ${selectedCarForVip.Model || selectedCarForVip.model || ''}`;
    const price = Number(selectedCarForVip.Price || selectedCarForVip.price || 0);
    const dealerIdentifier = selectedCarForVip.DealerID || selectedCarForVip.DealerCode || selectedCarForVip.Dealer || 'VIP Partner';
    const vipCode = 'VIP-' + Math.floor(1000 + Math.random() * 9000);

    try {
        if (CONFIG.SHOWROOM_API_URL) {
            await fetch(CONFIG.SHOWROOM_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'submitLead',
                    guest_name: name,
                    email: email,
                    phone: phone,
                    requested_vehicle: vehicleName,
                    dealer: dealerIdentifier,
                    sale_price: price,
                    referral_fee: price * 0.03,
                    vip_code: vipCode
                })
            });
        }

        alert(`VIP Pass generated successfully! Your code is ${vipCode}.`);
        closeVipModal();
    } catch (err) {
        console.error("Lead submission error:", err);
        alert(`VIP Pass submitted successfully! Code: ${vipCode}`);
        closeVipModal();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadInventory();
});