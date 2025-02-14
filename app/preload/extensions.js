/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2022 Jelmer van Arnhem
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
"use strict"

const {appData, readJSON, joinPath, fetchJSON} = require("../util")
const webviewSettingsFile = joinPath(appData(), "webviewsettings")
const settings = readJSON(webviewSettingsFile)

const loadSponsorblock = () => {
    let previousBlockEls = []
    let previousDuration = null
    let segments = []
    const vid = document.querySelector("video")
    if (!vid) {
        return
    }
    const fetchSponsorBlockData = () => {
        previousBlockEls.forEach(el => el.remove())
        previousBlockEls = []
        const videoId = window.location.href.replace(/^.*\/watch\?v=/g, "")
        previousDuration = vid.duration
        const categories = settings.sponsorblockcategories.split(",")
        const categoryNames = categories.map(cat => cat.split("~")[0])
        fetchJSON(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}`
            + `&categories=${JSON.stringify(categoryNames)}`).then(response => {
            const progressEl = document.querySelector(
                ".vjs-progress-holder, .ytp-progress-bar")
            segments = response
            for (const skip of segments) {
                const blockEl = document.createElement("div")
                blockEl.style.position = "absolute"
                blockEl.style.backgroundColor = categories.find(ca => ca.split(
                    "~")[0] === skip.category)?.split("~")[1] || "lime"
                blockEl.style.zIndex = 100000000
                blockEl.style.height = "100%"
                blockEl.style.minHeight = ".5em"
                progressEl.appendChild(blockEl)
                previousBlockEls.push(blockEl)
                setInterval(() => {
                    const left = skip.segment[0] / vid.duration * 100
                    const right = skip.segment[1] / vid.duration * 100
                    blockEl.style.left = `${left}%`
                    blockEl.style.width = `${right - left}%`
                }, 1000)
            }
        }).catch(err => console.warn(err))
    }
    if (window.location.href.includes("watch?v=") && settings.sponsorblock) {
        fetchSponsorBlockData()
        vid.addEventListener("durationchange", () => {
            fetchSponsorBlockData()
        })
        vid.addEventListener("timeupdate", () => {
            const current = vid.currentTime
            if (!current || !vid.duration) {
                return
            }
            if (vid.duration !== previousDuration) {
                fetchSponsorBlockData()
                return
            }
            for (const skip of segments) {
                const [start, end] = skip.segment
                if (current > start && current < end) {
                    vid.currentTime = end
                }
            }
        })
    }
}

window.addEventListener("load", () => {
    loadSponsorblock()
})
