class CreateNotes < ActiveRecord::Migration
  def change
    create_table :notes do |t|
      t.string :title, null: false
      t.text :body, null: false
      t.string :tags, array: true, default: []
      t.timestamps null: false
    end
  end
end
