class CreateTasks < ActiveRecord::Migration
  def change
    create_table :tasks do |t|
      t.text :name
      t.text :item
      t.date :completed
      t.belongs_to :todo, index: true
      t.timestamps null: false
    end
  end
end
