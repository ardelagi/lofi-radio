const { Message, MessageEmbed, Client, TextChannel, MessageButton, MessageActionRow } = require("discord.js");
const db = require("../schema/setup");
const { convertTime } = require("./convert");
const { KazagumoPlayer, KazagumoTrack } = require("kazagumo");

/**
 * Send temporary error embed
 */
async function oops(channel, message) {
    try {
        const embed = new MessageEmbed()
            .setColor("RED")
            .setDescription(message);

        const m = await channel.send({ embeds: [embed] });
        setTimeout(() => m.delete().catch(() => {}), 12000);
    } catch (err) {
        console.error(err);
    }
}

/**
 * Create Now Playing embed
 */
function neb(embed, player, client) {
    const config = require("../config");
    const icon = config.links.bg;

    return embed
        .setDescription(`[${player.queue.current.title}](${player.queue.current.uri}) • \`${player.queue.current.isStream ? '[**◉ LIVE**]' : convertTime(player.queue.current.length)}\``)
        .setImage(icon)
        .setFooter({ 
            text: `Requested by ${player.queue.current.requester.tag}`, 
            iconURL: player.queue.current.requester.displayAvatarURL({ dynamic: true }) 
        });
}

/**
 * Autoplay next tracks safely
 */
async function autoplay(player, client) {
    try {
        const autoplayId = player.data.get("autoplaySystem");
        const requester = player.data.get("requester");

        if (!autoplayId) return;

        const searched = `https://www.youtube.com/watch?v=${autoplayId}&list=RD${autoplayId}`;
        const { tracks } = await player.search(searched, { requester });

        if (!tracks || !tracks.length) return;

        await player.queue.add(tracks[0]);
        if (!player.playing && !player.paused) await player.play();
    } catch (err) {
        console.error(err);
    }
}

/**
 * Handle player queue for songs/playlists
 */
async function playerhandler(query, player, message) {
    try {
        const emojiaddsong = message.client.emoji.addsong;
        const emojiplaylist = message.client.emoji.playlist;
        const d = await db.findOne({ Guild: message.guild.id });

        let msg;
        if (d) {
            try { msg = await message.channel.messages.fetch(d.Message, { cache: true }); } 
            catch {}
        }

        if (!message.guild.members.me.voice.channel || player.state !== "CONNECTED") {
            player = await message.client.manager.createPlayer({
                guildId: message.guild.id,
                voiceId: message.member.voice.channel.id,
                textId: message.channel.id,
                deaf: true,
            });
        }

        const result = await player.search(query, { requester: message.author });
        if (!result.tracks.length) return message.reply({ content: 'No result was found' });

        if (result.type === 'PLAYLIST') result.tracks.forEach(track => player.queue.add(track));
        else player.queue.add(result.tracks[0]);

        if (!player.playing && !player.paused) await player.play();

        const embed = new MessageEmbed()
            .setColor(message.client.embedColor)
            .setDescription(result.type === 'PLAYLIST' ? 
                `${emojiplaylist} Queued ${result.tracks.length} from ${result.playlistName}` : 
                `${emojiaddsong} Queued [${result.tracks[0].title}](${result.tracks[0].uri})`
            );

        return message.channel.send({ embeds: [embed] })
            .then(a => setTimeout(() => a.delete().catch(() => {}), 5000))
            .catch(() => {});
    } catch (err) {
        console.error(err);
    }
}

/**
 * Handle track start event and update/send embed with buttons
 */
async function trackStartEventHandler(msgId, channel, player, track, client) {
    try {
        const icon = track.thumbnail || `https://img.youtube.com/vi/${player.queue.current.identifier}/hqdefault.jpg` || client.config.links.bg;

        let message;
        try { message = await channel.messages.fetch(msgId, { cache: true }); } 
        catch {}

        const embed = new MessageEmbed()
            .setColor(client.embedColor)
            .setDescription(`[${track.title}](${track.uri}) - \`[ ${track.isStream ? '[**◉ LIVE**]' : convertTime(player.queue.current.length)} ]\``)
            .setImage(icon)
            .setFooter({ text: `Requested by ${player.queue.current.requester.tag}`, iconURL: player.queue.current.requester.displayAvatarURL({ dynamic: true }) });

        const row = new MessageActionRow().addComponents(
            new MessageButton().setCustomId(`${player.guildId}voldown`).setEmoji(`🔉`).setStyle('SECONDARY'),
            new MessageButton().setCustomId(`${player.guildId}previous`).setEmoji(`⏮️`).setStyle('SECONDARY'),
            new MessageButton().setCustomId(`${player.guildId}pause`).setEmoji(`⏸️`).setStyle('SECONDARY'),
            new MessageButton().setCustomId(`${player.guildId}skip`).setEmoji(`⏭️`).setStyle('SECONDARY'),
            new MessageButton().setCustomId(`${player.guildId}volup`).setEmoji(`🔊`).setStyle('SECONDARY')
        );

        if (!message) {
            const m = await channel.send({
                content: "__**Join a voice channel and queue songs by name/url.**__\n\n",
                embeds: [embed],
                components: [row]
            });
            await db.findOneAndUpdate({ Guild: channel.guild.id }, { Message: m.id }, { upsert: true });
        } else {
            await message.edit({ embeds: [embed] });
        }
    } catch (err) {
        console.error(err);
    }
}

/**
 * Reply to a button interaction safely
 */
async function buttonReply(int, args, client) {
    try {
        const embed = new MessageEmbed()
            .setColor(int.client.embedColor)
            .setAuthor({ name: int.member.user.tag, iconURL: int.member.user.displayAvatarURL() })
            .setDescription(args);

        if (int.replied || int.deferred) {
            await int.editReply({ embeds: [embed] }).catch(() => {});
        } else {
            await int.reply({ embeds: [embed] }).catch(() => {});
        }

        setTimeout(async () => {
            if (int && !int.ephemeral) await int.deleteReply().catch(() => {});
        }, 2000);
    } catch (err) {
        console.error(err);
    }
}

module.exports = {
    playerhandler,
    trackStartEventHandler,
    buttonReply,
    oops,
    autoplay
};