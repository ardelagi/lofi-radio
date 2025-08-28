const { Client, CommandInteraction, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../schema/station.js');

module.exports = {
  name: 'play',
  description: 'Joins your voice channel and starts playing 24/7',
  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: false });

    const { channel } = interaction.member.voice;
    if (!channel) return interaction.editReply("You must be in a voice channel!");

    if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]))
      return interaction.editReply("I need `Connect` and `Speak` permissions!");

    if (!interaction.guild.members.me.permissionsIn(channel).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]))
      return interaction.editReply("I don't have permission to join your VC!");

    const ress = await db.findOne({ Guild: interaction.guildId });
    let station = ress?.Radio || "default";

    let np;
    const anim = require(`../../songs/${station.toLowerCase().replace(" ", "")}.json`);
    np = anim.words[Math.floor(Math.random() * anim.words.length)];

    const player = await client.manager.createPlayer({
      guildId: interaction.guildId,
      voiceId: channel.id,
      textId: interaction.channelId,
      deaf: true,
    });

    const result = await player.search(np, { requester: interaction.user });
    if (!result.tracks.length) return interaction.editReply('No result was found');
    if (result.type === "PLAYLIST") result.tracks.forEach(t => player.queue.add(t));
    else player.queue.add(result.tracks[0]);

    if (!player.playing && !player.paused) player.play();
    await player.setLoop('queue');

    const played = new EmbedBuilder()
      .setColor("#DDBD86")
      .setDescription(`<:notes:1119915814733217843> Joined ${channel}. <:dvd:1119915776732827778> Vote for 24/7 mode!`);

    const roww = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(`Vote for ${client.user.username}`)
        .setEmoji('1119915795565269112')
        .setURL('https://discord.gg/aromax-development-708565122188312579')
        .setStyle(ButtonStyle.Link)
    );

    await interaction.followUp({ embeds: [played], components: [roww] });
  },
};