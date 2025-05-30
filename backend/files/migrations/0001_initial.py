# Generated by Django 4.2.20 on 2025-04-17 06:06

from django.db import migrations, models
import django.db.models.deletion
import files.models
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='File',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('file', models.FileField(upload_to=files.models.file_upload_path)),
                ('original_filename', models.CharField(max_length=255)),
                ('file_type', models.CharField(max_length=100)),
                ('size', models.BigIntegerField()),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('content_hash', models.CharField(blank=True, db_index=True, max_length=64)),
                ('is_duplicate', models.BooleanField(default=False)),
                ('actual_size', models.BigIntegerField(default=0, help_text='Actual disk space used (differs from size for duplicates)')),
                ('reference_file', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='duplicates', to='files.file')),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
    ]
