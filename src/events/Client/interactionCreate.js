const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../../schema/setup');
const db2 = require("../../schema/dj");

module.exports = {
  name: 'interactionCreate',
  run: async (client, interaction) => {

    // Slash / Context Menu
    if (interaction.isCommand() || interaction.isContextMenu()) {
      const SlashCommands = client.slashCommands.get(interaction.commandName);
      if (!SlashCommands) return;

      // Check bot permissions
      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.SendMessages)) {
        return await interaction.user.dmChannel?.send({
          content: `I don't have **\`SEND_MESSAGES\`** permission in <#${interaction.channelId}> to execute this **\`${SlashCommands.name}\`** command.`,
        }).catch(() => {});
      }

      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewChannel)) return;

      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.EmbedLinks)) {
        return await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#DDBD86')
              .setDescription(`I don't have **\`EMBED_LINKS\`** permission to execute this **\`${SlashCommands.name}\`** command.`)
          ],
          ephemeral: true
        }).catch(() => {});
      }

      // Player check
      const player = client.manager.players.get(interaction.guildId);
      if (SlashCommands.player && !player) {
        return await interaction.reply({
          content: `There is no player for this guild.`,
          ephemeral: true
        }).catch(() => {});
      }

      // User permissions check
      if (SlashCommands.userPrams?.length && !interaction.member.permissions.has(SlashCommands.userPrams)) {
        return await interaction.reply({
          content: `You need permission to use this command: \`${SlashCommands.userPrams.join(', ')}\``,
          ephemeral: true
        }).catch(() => {});
      }

      // Bot permissions check
      if (SlashCommands.botPrams?.length && !interaction.guild.members.me.permissions.has(SlashCommands.botPrams)) {
        return await interaction.reply({
          content: `I need the following permissions to run this command: \`${SlashCommands.botPrams.join(', ')}\``,
          ephemeral: true
        }).catch(() => {});
      }

      // Voice channel checks
      if (SlashCommands.inVoiceChannel && !interaction.member.voice.channel) {
        return await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#DDBD86')
              .setDescription(`<:loud:1119915800535511070> You must be connected to a voice channel to use this command.`)
          ],
          ephemeral: true
        }).catch(() => {});
      }

      if (SlashCommands.sameVoiceChannel && interaction.guild.members.me.voice.channel) {
        if (interaction.guild.members.me.voice.channelId !== interaction.member.voice.channelId) {
          return await interaction.reply({
            content: `You must be in the same voice channel as ${interaction.client.user}`,
            ephemeral: true
          }).catch(() => {});
        }
      }

      // DJ role check
      if (SlashCommands.dj) {
        const data = await db2.findOne({ Guild: interaction.guildId });
        const perm = PermissionsBitField.Flags.ManageGuild;
        if (data?.Mode) {
          let pass = false;
          if (data.Roles?.length) {
            interaction.member.roles.cache.forEach(role => {
              if (data.Roles.includes(role.id)) pass = true;
            });
          }
          if (!pass && !interaction.member.permissions.has(perm)) {
            return await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor('#DDBD86')
                  .setDescription(`<:profile:1119915826326278265> **You don't have permission to use this command**\n<:blank:1120331253569302619><:dj:1119915773742288917> **Required: DJ Role**`)
              ],
              ephemeral: true
            }).catch(() => {});
          }
        }
      }

      // Run command
      try {
        await SlashCommands.run(client, interaction);
      } catch (error) {
        console.error(error);
        const embed = new EmbedBuilder()
          .setColor('#DDBD86')
          .setDescription(`👋 An error occurred while running this command.`);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }
      }
    }

    // Button interaction
    if (interaction.isButton()) {
      const data = await db.findOne({ Guild: interaction.guildId });
      if (data && interaction.channelId === data.Channel && interaction.message.id === data.Message) {
        return client.emit("playerButtons", interaction, data);
      }
    }

  }
};