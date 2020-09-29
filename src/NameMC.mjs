import axios from "axios";

import { DataParser } from "./DataParser.mjs";
import { WrapperError } from "./WrapperError.mjs";

import { nameRegExp, profileRegExp, skinRegExp, capes } from "./utils.mjs";

export class NameMC {

    constructor() {
        this.options = {
            endpoint: "namemc.com"
        };
    }

    /**
     * @description Sets options
     * @param {Object} options - Object with parameters for the class
     * @param {string} [options.proxy] - Proxy for requests
     * @param {string} [options.endpoint=namemc.com] - NameMC Endpoint
     */
    setOptions(options) {
        this.options = {
            ...this.options,
            ...options
        };
    }

    /**
     * @description Get skin history by nickname
     * @param {string} nickname - Player nickname
     * @param {(number|string)} [page=1] - Page number
     * @returns {Promise} Promise array with skins objects
     */
    skinHistory(nickname, page = 1) {
        return new Promise((resolve, reject) => {
            if (nickname.match(nameRegExp)) {
                axios.get(`${this.getEndpoint()}/profile/${nickname}`)
                    .then(({ request, data }) => {
                        if ((request?.res?.responseUrl || request.responseURL).match(profileRegExp)) {

                            const user = /<\s*a href="\/minecraft-skins\/profile\/([^]+?)"[^>]*>(?:.*?)<\s*\/\s*a>/.exec(data);

                            if (!user) {
                                return resolve([]);
                            }

                            const [, userId] = user;

                            axios.get(`${this.getEndpoint()}/minecraft-skins/profile/${userId}?page=${page}`)
                                .then(({ data })  => {
                                    const skins = new DataParser()
                                        .parseSkins.call(this, data);

                                    if (skins) {
                                        resolve(
                                            skins
                                        );
                                    } else {
                                        reject(
                                            new WrapperError().get(4)
                                        );
                                    }
                                })
                                .catch(error =>
                                    reject(
                                        new WrapperError().get(1, error)
                                    )
                                );
                        } else {
                            reject(
                                new WrapperError().get(3, nickname)
                            );
                        }
                    })
                    .catch((error) => {
                        reject(
                            new WrapperError().get(1, error)
                        );
                    });
            } else {
                reject(
                    new WrapperError().get(2)
                );
            }
        })
    }

    /**
     * @description Get capes by nickname
     * @param {string} nickname - Player nickname
     * @returns {Promise} Promise array with capes objects
     */
    getCapes(nickname) {
        return new Promise((resolve, reject) => {
            if (nickname.match(nameRegExp)) {
                axios.get(`${this.getEndpoint()}/profile/${nickname}`)
                    .then(({ request, data }) => {
                        if ((request?.res?.responseUrl || request.responseURL).match(profileRegExp)) {

                            resolve(
                                new DataParser()
                                    .parseCapes.call(this, data)
                            );

                        } else {
                            reject(
                                new WrapperError().get(3, nickname)
                            );
                        }
                    })
                    .catch((error) => reject(
                        new WrapperError().get(1, error)
                        )
                    );
            } else {
                reject(
                    new WrapperError().get(2)
                );
            }
        })
    }

    /**
     * @description Get skin renders
     * @param {Object} options - Object with parameters for generating renders
     * @param {string} options.skin="12b92a9206470fe2" - Skin hash
     * @param {"classic"|"slim"} [options.model="classic"] - Skin type for model
     * @param {(number|string)} [options.width=600] - Width for 3d render image
     * @param {(number|string)} [options.height=300] - Height for 3d render image
     * @param {(number|string)} [options.theta=-30] - Angle to rotate the 3d model in a circle. (-360 - 360)
     * @param {(number|string)} [options.scale=4] - Scale for 2d face render, 32 max (8px * scale)
     * @param {boolean} [options.overlay=true] - Use skin overlay on 2d face render
     * @returns {Object} Object with renders skin
     */
    getRenders({
                   skin = "12b92a9206470fe2", model = "classic", width = 600,
                   height = 300, scale = 4, overlay = true, theta = -30
    }) {
        const endpoint = this.getEndpoint("render");

        return {
            body: {
                front: `${endpoint}/skin/3d/body.png?skin=${skin}&model=${model}&width=${width}&height=${height}&theta=${theta}`,
                front_and_back: `${endpoint}/skin/3d/body.png?skin=${skin}&model=${model}&width=${width}&height=${height}&front_and_back&theta=${theta}`
            },
            face: `${endpoint}/skin/2d/face.png?skin=${skin}&overlay=${overlay}&scale=${scale}`
        };
    }

    /**
     * @description Transform skin method
     * @param {Object} options - Object with parameters for skin transformation
     * @param {string} options.skin - Skin hash
     * @param {"grayscale"|"invert"|"rotate-hue-180"|"rotate-head-left"|"rotate-head-right"|"hat-pumpkin-mask-1"|"hat-pumpkin-mask-2"|"hat-pumpkin-mask-3"|"hat-pumpkin-mask-4"|"hat-pumpkin"|"hat-pumpkin-creeper"|"hat-santa"} options.transformation - Transformation type
     * @param {"classic"|"slim"} [options.model="classic"] - Skin type for renders
     * @returns {Promise} Promise url string on transformed skin
     */
    transformSkin({ skin, transformation, model = "classic" }) {
        const endpoint = this.getEndpoint();

        const transformations = [
            "grayscale", "invert", "rotate-hue-180", "rotate-head-left",
            "rotate-head-right", "hat-pumpkin-mask-1", "hat-pumpkin-mask-2", "hat-pumpkin-mask-3",
            "hat-pumpkin-mask-4", "hat-pumpkin", "hat-pumpkin-creeper", "hat-santa"
        ];

        return new Promise((resolve, reject) => {
            if (!(skin && transformation)) {
                reject(new WrapperError().get(7));
            }

            if (!transformations.includes(transformation)) {
                reject(new WrapperError().get(6, transformation));
            }

            axios.post(`${endpoint}/transform-skin`, `skin=${skin}&transformation=${transformation}`, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                    "origin": "https://ru.namemc.com"
                }
            })
                .then(({ request }) => {
                    const [, hash] = (request?.res?.responseUrl || request.responseURL).match(skinRegExp);

                    if (hash) {
                        resolve({
                            url: `${endpoint}/texture/${hash}.png`,
                            hash,
                            model,
                            renders: this.getRenders({
                                skin: hash,
                                model
                            })
                        });
                    } else {
                        reject(
                            new WrapperError().get(4)
                        );
                    }
                })
                .catch((error) => {
                    if (error?.response?.status === 404) {
                        reject(
                            new WrapperError().get(5, skin)
                        );
                    }

                    reject(
                        new WrapperError().get(1, error)
                    );
                })
        });
    }

    /**
     * @description Get cape type by cape hash
     * @param {string} hash - Cape hash
     * @returns {Object} Object with cape information
     */
    getCapeType(hash) {
        const cape = capes.get(hash);

        return cape ?
            {
                type: "minecraft",
                name: cape
            }
            :
            {
                type: "optifine",
                name: "Optifine"
            }
    }

    /**
     * @description Get player friends by nickname
     * @param {string} nickname - Player nickname
     * @returns {Promise} Promise array with friends objects
     */
    getFriends(nickname) {
        return new Promise((resolve, reject) => {
            if (nickname.match(nameRegExp)) {

                axios.get(`${this.getEndpoint(null, "api.ashcon.app")}/mojang/v2/user/${nickname}`)
                    .then(response => response.data)
                    .then(({ uuid }) => {

                        axios.get(`${this.getEndpoint("api")}/profile/${uuid}/friends`)
                            .then(({ data }) => resolve(data))
                            .catch((error) =>
                                reject(
                                    new WrapperError().get(1, error)
                                )
                            );

                    })
                    .catch((error) => {
                        if (error?.response?.status === 404) {
                            reject(
                                new WrapperError().get(3, nickname)
                            );
                        }

                        reject(
                            new WrapperError().get(1, error)
                        );
                    });

            } else {
                reject(
                    new WrapperError().get(2)
                );
            }
        })
    }

    /**
     * @description Get skins from a specific tab of the site
     * @param {"trending"|"new"|"random"} [tab="trending"] - Tab with which to get skins
     * @param {(number|string)} [page=1] - Tab page (1 - 100)
     * @param {"daily"|"weekly"|"monthly"|"top"} [section="weekly"] - Section, used when getting trending skins
     * @returns {Promise} Promise array with skins objects
     */
    getSkins(tab = "trending", page = 1, section = "weekly") {
        const tabs = ["trending", "new", "random"];
        const sections = ["daily", "weekly", "monthly", "top"];

        return new Promise(((resolve, reject) => {
            if (!tabs.includes(tab)) {
                reject(new WrapperError().get(6, tab));
            }
            if (!sections.includes(section)) {
                reject(new WrapperError().get(6, section));
            }

            axios.get(`${this.getEndpoint()}/minecraft-skins/${tab}${section === "trending" ? `/${section}` : ""}?page=${page}`)
                .then(({ data }) =>
                    resolve(
                        new DataParser()
                            .parseSkins.call(this, data)
                    )
                )
                .catch((error) =>
                    reject(
                        new WrapperError().get(1, error)
                    )
                )
        }));
    }

    /**
     * @class
     * @ignore
     */
    getEndpoint(subdomain, domain) {
        const { proxy, endpoint } = this.options;

        return `${proxy ? `${proxy}/` : ""}https://${subdomain ? `${subdomain}.` : ""}${domain || endpoint}`;
    }
}
