import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

interface Params {
    username?: string;
    type?: string;
    format?: string;
}

interface Entry {
    media: {
        id: number;
        title: {
            english?: string;
            romaji?: string;
        },
        description?: string;
        coverImage?: {
            extraLarge?: string;
        };
        bannerImage?: string;
        startDate?: {
            year?: number;
            month?: number;
            day?: number;
        },
        endDate?: {
            year?: number;
            month?: number;
            day?: number;
        }
    }
}

interface MediaList {
    name: string;
    entries: Entry[];
}

const MediaFormats: string[] = ['ANIME', 'MANGA'];
const API_URL: string = 'https://graphql.anilist.co/';

export default async (request: VercelRequest, response: VercelResponse) => {
    
    const { 
        username = 'KiranHart',  
        list = 'Completed',
        format = 'ANIME'
    }: Params = request.query;

    if (MediaFormats.indexOf(format.toUpperCase()) === -1) {
        response.status(400).send({
            error: 'Invalid Format',
            message: `Format '${format}' is not supported.`
        });
        return;
    }

    const info = await fetchUserList(username, format);
    
    if (info == null) {
        response.status(404).send({
            error: 'Could not fetch lists for that user',
        });
        return;
    }

    const filteredList: MediaList = info.lists.filter((l) => l.name === list);

    if (filteredList.length === 0) {
        response.status(404).send({
            error: `No entries for the following list '${list}' were found`,
        });
        return;
    }

    let rows = '';

    filteredList.forEach((l) => {
        l.entries.forEach((e) => {
            rows += `
                <tr class="entry">
                    <td class="entry-title">${e.media.title.english || e.media.title.romaji}</td>
                    <td class="entry-link"><a href=${format.toUpperCase() === 'ANIME' ? `https://anilist.co/anime/${e.media.id}` : `https://anilist.co/manga/${e.media.id}`}>${format.toUpperCase() === 'ANIME' ? `https://anilist.co/anime/${e.media.id}` : `https://anilist.co/manga/${e.media.id}`}</a></td>
                    <td class="entry-cover"><a href=${e.media.coverImage.extraLarge}>${e.media.coverImage.extraLarge}</a></td>
                    <td class="entry-banner"><a href=${e.media.coverImage.extraLarge}>${e.media.bannerImage}<a/></td>
                    <td class="entry-start">${e.media.startDate.year}-${e.media.startDate.month}-${e.media.startDate.day}</td>
                    <td class="entry-end">${e.media.endDate.year}-${e.media.endDate.month}-${e.media.endDate.day}</td>
                </tr>
            `;
        });
    });

    response.status(200).send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>${list}</title>
                <style>
                    html, body {
                        width: 100vw;
                    }

                    table {
                        width: 97%;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Link</th>
                            <th>Cover</th>
                            <th>Banner</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </body>
        </html>
    `);
};


const fetchUserList = async(username: string, format: string): Promise<any> => {
    const request = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            query: `
            {
                MediaListCollection(userName: "${username}", type: ${format.toUpperCase()}) {
                  lists {
                    name
                    entries {
                      media {
                        id
                        title {
                          english
                          romaji
                        }
                        description
                        coverImage {
                          extraLarge
                        }
                        bannerImage
                        startDate {
                          year
                          month
                          day
                        },
                        endDate {
                          year
                          month
                          day
                        }
                      }
                    }
                  }
                }
              }              
            `
        })
    });

    const {data: {MediaListCollection}} = await request.json();
    return MediaListCollection;
}; 