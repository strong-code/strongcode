class AddUserRefToJournalEntries < ActiveRecord::Migration
  def change
    add_reference :journal_entries, :user, foreign_key: true
  end
end
