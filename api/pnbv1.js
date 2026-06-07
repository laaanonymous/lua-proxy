export default function handler(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`local me = getLocal()
if not me then return end

local myID = tostring(me.userID)

local response, err = fetch("https://pastebin.com/raw/hy4xsxhg")
if err or not response then
    response = ""
end

local isLicensed = response:find(myID) ~= nil

if not isLicensed then
    sendDialog({
        title   = "🔒 NO ACCESS",
        message = "Your UserID: " .. myID,
        confirm = "Close"
    })
    return
else
    sendNotification("🔓 Access Accept")
end

local worldname = ""
local bfgX = 0
local bfgY = 0
local magX = 0
local magY = 0
local magID = ""
local AutoBFGToggle = false
local isReconnecting = false
local bfgReady = false
local firstRun = false
local everSentRadio = false

local delay = 1801
local itemIDs = {}
local AutoConsumeToggle = false

local nextConsumeTime = 0

local uiBFG = UserInterface.new("Auto Reconnect BFG", "Agriculture")
uiBFG:addInputString("World Name", nil, "", nil, "Settings", "worldname")
uiBFG:addInputString("BfgX", nil, "", nil, "Settings", "bfgX")
uiBFG:addInputString("BfgY", nil, "", nil, "Settings", "bfgY")
uiBFG:addInputString("MagX", nil, "", nil, "Settings", "magX")
uiBFG:addInputString("MagY", nil, "", nil, "Settings", "magY")
uiBFG:addInputString("MagID", nil, "", nil, "Settings", "magID")
uiBFG:addToggleButton("Auto BFG", false, "AutoBFGToggle")
uiBFG:addDivider()
uiBFG:addInputString("Item ID", nil, "", nil, "LocalDining", "itemIDsInput")
uiBFG:addToggle("Auto Consume", false, "AutoConsumeToggle")
uiBFG:addDivider()
local jsonBFG = uiBFG:generateJSON()

function OnDraw(d)
    removeHook("ondraw")
    runCoroutine(function()
        CSleep(6000)
        addCategory("UI", "Source")
        addIntoModule(jsonBFG, "UI")
    end)
end

function OnValue(type, name, value)
    if name == "worldname" then
        worldname = tostring(value)
    elseif name == "bfgX" then
        bfgX = tonumber(value) or 0
    elseif name == "bfgY" then
        bfgY = tonumber(value) or 0
    elseif name == "magX" then
        magX = tonumber(value) or 0
    elseif name == "magY" then
        magY = tonumber(value) or 0
    elseif name == "magID" then
        magID = tostring(value)
    elseif name == "AutoBFGToggle" then
        AutoBFGToggle = tostring(value):lower() == "true"
        if AutoBFGToggle then
            sendNotification("🟢 Auto BFG ON")
            firstRun = false
            isReconnecting = true
            bfgReady = false
        else
            sendNotification("🔴 Auto BFG OFF")
            bfgReady = false
            isReconnecting = false
            firstRun = false
        end
    elseif name == "AutoConsumeToggle" then
        AutoConsumeToggle = tostring(value):lower() == "true"
        sendNotification(AutoConsumeToggle and "🟢 Auto Consume ON" or "🔴 Auto Consume OFF")
    elseif name == "itemIDsInput" then
        itemIDs = {}
        for id in tostring(value):gmatch("[^,]+") do
            local n = tonumber(id:match("^%s*(.-)%s*$"))
            if n then table.insert(itemIDs, n) end
        end
    end
end

function SetupBFG()
    if not everSentRadio then
        sendPacket(2, "action|input\\n|text|/radiosdb")
        everSentRadio = true
        sleep(500)
    end
    FindPath(tonumber(bfgX), tonumber(bfgY))
    sleep(1000)
    sendPacket(2, "action|dialog_return\\ndialog_name|itemsucker\\ntilex|" .. magX .. "|\\ntiley|" .. magY .. "|\\nbuttonClicked|getplantationdevice")
    sleep(500)
    sendPacket(2, "action|dialog_return\\ndialog_name|cheat_dialog\\nselect_farm_id|" .. magID .. "\\nbuttonClicked|OK!")
    sleep(500)
    sendPacket(2, "action|dialog_return\\ndialog_name|cheat_dialog\\ncheat_nocollect|1\\ncheat_autobfg|1\\ncheat_autofarm|1\\nbuttonClicked|OK!")
end

function Reconnect()
    local connected = false
    while not connected do
        sendNotification("🔄 Reconnect to Join " .. worldname)
        sleep(3000)
        sendPacket(3, "action|join_request\\nname|" .. worldname .. "\\ninvitedWorld|0")
        local waited = 0
        while waited < 10000 do
            sleep(500)
            waited = waited + 500
            if GetWorldName() == worldname then
                connected = true
                break
            end
        end
        if connected then
            firstRun = false
            isReconnecting = false
            everSentRadio = false
            sendNotification("✅ Reconnect Success In " .. worldname)
            sleep(1500)
            SetupBFG()
            return true
        end
    end
    return false
end

addHook(function(var, pkt)
    if not var or not var.v1 then return end

    if var.v1 == "OnRequestWorldSelectMenu" then
        everSentRadio = false
    end

    if var.v1:find("OnDialogRequest") and var.v2 and var.v2:find("GTFY Cheat Menu") then
        return true
    end

    if var.v1:find("OnStoreRequest") then
        return true
    end

end, "onVariant")

applyHook()

function Place(id)
    local me = getLocal()
    if not me then return end
    local pkt = {}
    pkt.type = 3
    pkt.value = id
    pkt.px = math.floor(me.posX / 32)
    pkt.py = math.floor(me.posY / 32)
    pkt.x = me.posX
    pkt.y = me.posY
    sendPacketRaw(false, pkt)
end

function makan()
    for _, id in ipairs(itemIDs) do
        Place(id)
        sleep(1000)
    end
    nextConsumeTime = getTime() + (delay * 1000)
    sendNotification("💊 Consume Done")
end

runThread(function()
    while true do
        if AutoBFGToggle then
            local diWorld = GetWorldName() == worldname
            if not diWorld or not bfgReady or isReconnecting then
                bfgReady = false
                local success = Reconnect()
                if success then
                    bfgReady = true
                    isReconnecting = false
                end
            end
        else
            bfgReady = false
            isReconnecting = false
            firstRun = false
        end
        sleep(3000)
    end
end)

runThread(function()
    while true do
        if AutoConsumeToggle then
            makan()
            while AutoConsumeToggle do
                local remaining = math.floor((nextConsumeTime - getTime()) / 1000)
                if remaining <= 0 then break end
                sleep(1000)
            end
        else
            sleep(200)
        end
    end
end)
`);
}
