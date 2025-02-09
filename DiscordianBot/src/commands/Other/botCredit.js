module.exports = {
    data: {
      name: "credit",
      description: "Credits for making the bot!",
      "integration_types": [1],
      "contexts": [0, 1, 2]
    },
    async execute(interaction) {
      // Send the message
      await interaction.reply({ content: `Bot made by yours truly, <@530047797441855553>`, tts: true, ephemeral: false });
    }
  }